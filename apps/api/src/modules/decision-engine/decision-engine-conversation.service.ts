/**
 * Decision Engine Conversation Service
 *
 * Wraps the decision engine with Myra-style clarifying questions for
 * anonymous users on the homepage chat box. Handles state persistence via
 * decision_briefs.metadata JSONB, keyed by brief_id (used as session_id).
 */

import { decisionEngineService, DecisionEngineError } from './decision-engine.service.js';
import { decisionEngineRepository } from './decision-engine.repository.js';
import { clarifyingQuestionsService } from '../voice-query/clarifying-questions.service.js';
import type { DecisionClarifyingQuestion } from '@artist-booking/shared';

// ─── Types ────────────────────────────────────────────────

interface ClarifyingState {
  phase: 'collecting' | 'ready';
  collected_entities: Record<string, unknown>;
  asked_fields: string[];
  clarifying_rounds: number;
  user_skipped: boolean;
  original_query: string;
}

export type DecisionConversationResult =
  | {
      response_type: 'clarifying_questions';
      session_id: string;
      response_text: string;
      clarifying_questions: DecisionClarifyingQuestion[];
      parsed_context: Record<string, unknown>;
    }
  | {
      response_type: 'recommendations';
      session_id: string;
      response_text: string;
      brief_id: string;
      summary: string;
      parsed_brief: Record<string, unknown>;
      recommendations: Array<Record<string, unknown>>;
      constraints_note: string | null;
    };

// ─── Service ──────────────────────────────────────────────

export class DecisionEngineConversationService {
  /**
   * Entry point: handle a user message and return either clarifying questions
   * or final recommendations.
   */
  async handleMessage(input: {
    raw_text: string;
    source: string;
    session_id?: string | null;
    user_id?: string | null;
    // Explicit overrides from structured fields
    event_type?: string;
    city?: string;
    event_date?: string;
    audience_size?: number;
    budget_max_paise?: number;
    genres?: string[];
  }): Promise<DecisionConversationResult> {
    const rawText = input.raw_text.trim();

    // ─── Continuing a conversation ─────────────────────
    if (input.session_id) {
      const existing = await decisionEngineRepository.getBriefById(input.session_id);
      if (existing) {
        const metadata = this.parseMetadata(existing.metadata);
        const clarifying = metadata.clarifying as ClarifyingState | undefined;

        if (clarifying?.phase === 'collecting') {
          return this.handleClarifyingAnswer(existing, clarifying, rawText, input);
        }
        // If already in 'ready' state or no clarifying state, fall through to new brief
      }
    }

    // ─── New conversation ──────────────────────────────
    return this.handleNewBrief(rawText, input);
  }

  // ─── New brief: parse, check missing, decide path ──
  private async handleNewBrief(
    rawText: string,
    input: {
      source: string;
      user_id?: string | null;
      event_type?: string;
      city?: string;
      event_date?: string;
      audience_size?: number;
      budget_max_paise?: number;
      genres?: string[];
    },
  ): Promise<DecisionConversationResult> {
    // Parse entities from raw text
    const parsed = decisionEngineService.parseBrief(rawText);

    // Merge explicit fields (caller can override)
    const collected: Record<string, unknown> = {
      city: input.city ?? parsed.city,
      event_type: input.event_type ?? parsed.event_type,
      event_date: input.event_date ?? parsed.event_date,
      audience_size: input.audience_size ?? parsed.audience_size,
      budget_max_paise: input.budget_max_paise ?? parsed.budget_max_paise,
      genres: (input.genres ?? parsed.genres)?.filter(Boolean),
      vibe_tags: parsed.vibe_tags,
    };

    // Normalize: clarifyingQuestionsService uses 'budget' in rupees
    if (collected.budget_max_paise) {
      collected.budget = Number(collected.budget_max_paise) / 100;
    }
    if (collected.event_date) {
      collected.date = collected.event_date;
    }
    if (Array.isArray(collected.genres) && collected.genres.length > 0) {
      collected.genre = (collected.genres as string[])[0];
    }

    // Check what's missing
    const missingFields = clarifyingQuestionsService.getMissingRequiredFields(collected);

    // Create a session brief row now so we have a session_id to return
    const brief = await decisionEngineRepository.createBrief({
      source: input.source,
      raw_text: rawText,
      status: missingFields.length === 0 ? 'processing' : 'collecting',
      created_by_user_id: input.user_id ?? null,
      structured_brief: {},
      metadata: {},
    });

    // If nothing missing → run decision engine directly
    if (missingFields.length === 0) {
      return this.runRecommendations(brief.id, collected, rawText, input);
    }

    // Otherwise → ask clarifying questions and save state
    const questions = clarifyingQuestionsService.selectQuestions(missingFields, [], 2);
    const askedFields = questions.map((q) => q.field);

    const state: ClarifyingState = {
      phase: 'collecting',
      collected_entities: collected,
      asked_fields: askedFields,
      clarifying_rounds: 0,
      user_skipped: false,
      original_query: rawText,
    };

    await decisionEngineRepository.updateBrief(brief.id, {
      metadata: { clarifying: state },
    });

    const acknowledgment = clarifyingQuestionsService.buildAcknowledgment(collected);
    const parsedContext = this.buildParsedContext(collected);

    return {
      response_type: 'clarifying_questions',
      session_id: brief.id,
      response_text: acknowledgment,
      clarifying_questions: questions as DecisionClarifyingQuestion[],
      parsed_context: parsedContext,
    };
  }

  // ─── Clarifying answer: merge, check threshold ─────
  private async handleClarifyingAnswer(
    brief: Record<string, unknown>,
    state: ClarifyingState,
    answerText: string,
    input: { source: string; user_id?: string | null },
  ): Promise<DecisionConversationResult> {
    const briefId = brief.id as string;

    // Skip detection
    if (clarifyingQuestionsService.isSkipRequest(answerText)) {
      state.user_skipped = true;
      return this.runRecommendations(briefId, state.collected_entities, state.original_query, input);
    }

    // Merge answer entities into collected set
    const merged = await clarifyingQuestionsService.mergeEntities(state.collected_entities, answerText);
    state.collected_entities = merged;
    state.clarifying_rounds += 1;

    // Check if we have enough now
    if (clarifyingQuestionsService.hasEnoughInfo(merged, state.clarifying_rounds, false)) {
      return this.runRecommendations(briefId, merged, state.original_query, input);
    }

    // Need more info — ask next round
    const stillMissing = clarifyingQuestionsService.getMissingRequiredFields(merged);
    const nextQuestions = clarifyingQuestionsService.selectQuestions(stillMissing, state.asked_fields, 2);

    if (nextQuestions.length === 0) {
      // No more questions to ask, proceed with what we have
      return this.runRecommendations(briefId, merged, state.original_query, input);
    }

    state.asked_fields.push(...nextQuestions.map((q) => q.field));

    // Save updated state
    await decisionEngineRepository.updateBrief(briefId, {
      metadata: { clarifying: state },
    });

    // Build acknowledgment for what they just told us
    const parts: string[] = [];
    if (merged.event_type) parts.push(`${merged.event_type}`);
    if (merged.budget) parts.push(`₹${Number(merged.budget).toLocaleString('en-IN')} budget`);
    const ack = parts.length > 0 ? `Got it — ${parts.join(', ')}. One more thing:` : 'One more thing:';

    return {
      response_type: 'clarifying_questions',
      session_id: briefId,
      response_text: ack,
      clarifying_questions: nextQuestions as DecisionClarifyingQuestion[],
      parsed_context: this.buildParsedContext(merged),
    };
  }

  // ─── Run the decision engine ───────────────────────
  private async runRecommendations(
    sessionBriefId: string,
    entities: Record<string, unknown>,
    rawText: string,
    input: { source: string; user_id?: string | null },
  ): Promise<DecisionConversationResult> {
    // Mark the session brief as superseded — we'll create a fresh brief via the normal flow
    // This keeps the recommendation query clean and uses all existing decision engine logic.
    try {
      await decisionEngineRepository.updateBrief(sessionBriefId, {
        status: 'superseded',
        metadata: { superseded_reason: 'ran_recommendations' },
      });
    } catch {
      // Non-fatal
    }

    // Build the brief input for the decision engine
    const briefInput: Record<string, unknown> = {
      raw_text: rawText,
      source: input.source,
    };
    if (entities.event_type) briefInput.event_type = entities.event_type;
    if (entities.city) briefInput.city = entities.city;
    if (entities.event_date || entities.date) briefInput.event_date = entities.event_date || entities.date;
    if (entities.audience_size) briefInput.audience_size = entities.audience_size;
    if (entities.budget_max_paise) {
      briefInput.budget_max_paise = Number(entities.budget_max_paise);
    } else if (entities.budget) {
      briefInput.budget_max_paise = Math.round(Number(entities.budget) * 100);
    }
    if (Array.isArray(entities.genres) && entities.genres.length > 0) {
      briefInput.genres = entities.genres;
    } else if (entities.genre) {
      briefInput.genres = [entities.genre];
    }

    try {
      const result = await decisionEngineService.createBriefAndRecommend(
        input.user_id ?? null,
        briefInput as any,
      );

      const topName = result.recommendations[0]?.artist_name || 'a great option';
      const responseText = result.recommendations.length > 0
        ? `Found ${result.recommendations.length} great options! Top pick: ${topName}.`
        : "I couldn't find strong matches. Try broadening your search.";

      return {
        response_type: 'recommendations',
        session_id: result.brief_id,
        response_text: responseText,
        brief_id: result.brief_id,
        summary: result.summary,
        parsed_brief: result.parsed_brief as unknown as Record<string, unknown>,
        recommendations: result.recommendations as Array<Record<string, unknown>>,
        constraints_note: result.constraints_note,
      };
    } catch (err) {
      if (err instanceof DecisionEngineError) throw err;
      throw err;
    }
  }

  // ─── Helpers ────────────────────────────────────────

  private parseMetadata(raw: unknown): Record<string, unknown> {
    if (!raw) return {};
    let parsed = raw;
    // Handle double-stringified JSONB (string → parse → might still be string)
    while (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { return {}; }
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
    return {};
  }

  private buildParsedContext(entities: Record<string, unknown>): Record<string, unknown> {
    const ctx: Record<string, unknown> = {};
    if (entities.city) ctx.city = entities.city;
    if (entities.event_type) ctx.event_type = entities.event_type;
    if (entities.genre || (Array.isArray(entities.genres) && entities.genres.length > 0)) {
      ctx.genre = entities.genre || (entities.genres as string[])[0];
    }
    if (entities.audience_size) ctx.audience_size = entities.audience_size;
    if (entities.budget) ctx.budget = entities.budget;
    if (entities.event_date || entities.date) ctx.event_date = entities.event_date || entities.date;
    return ctx;
  }
}

export const decisionEngineConversationService = new DecisionEngineConversationService();
