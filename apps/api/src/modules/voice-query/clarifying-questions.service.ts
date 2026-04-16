/**
 * Clarifying Questions Service — Myra-style conversational flow.
 * Detects missing required fields, generates questions, merges answers.
 */

import {
  CLARIFYING_MAX_ROUNDS,
  CLARIFYING_MAX_QUESTIONS_PER_ROUND,
  CLARIFYING_REQUIRED_FIELDS,
} from '@artist-booking/shared';
import type { ClarifyingQuestion, ClarifyingState } from '@artist-booking/shared';
import { voiceIntentService } from './voice-intent.service.js';

// ─── Field Templates ────────────────────────────────────────

const FIELD_TEMPLATES: Record<string, ClarifyingQuestion> = {
  event_type: {
    field: 'event_type',
    question: 'What type of event is this?',
    question_hi: 'Ye kis tarah ka event hai?',
    options: [
      { label: 'Wedding / Sangeet', value: 'wedding' },
      { label: 'Corporate', value: 'corporate' },
      { label: 'College Fest', value: 'college_event' },
      { label: 'House Party', value: 'private_party' },
      { label: 'Concert', value: 'concert' },
    ],
  },
  budget: {
    field: 'budget',
    question: "What's your approximate budget for the artist?",
    question_hi: 'Artist ke liye aapka budget kitna hai?',
    options: [
      { label: 'Under ₹50K', value: 5000000 },
      { label: '₹50K – 1 Lakh', value: 10000000 },
      { label: '₹1 – 3 Lakh', value: 30000000 },
      { label: '₹3 – 5 Lakh', value: 50000000 },
      { label: '₹5 Lakh+', value: 70000000 },
    ],
  },
  date: {
    field: 'date',
    question: 'When is the event?',
    question_hi: 'Event kab hai?',
    options: [
      { label: 'This week', value: 'this_week' },
      { label: 'Next week', value: 'next_week' },
      { label: 'This month', value: 'this_month' },
      { label: 'Next month', value: 'next_month' },
      { label: 'Decide later', value: 'skip' },
    ],
  },
};

// ─── Skip Detection ─────────────────────────────────────────

const SKIP_PATTERNS = /^(skip|just show|show results|bas dikhao|rehne do|chodo|chhodo|dikha do|show me|whatever|any|kuch bhi|i don'?t know|pata nahi|decide later)$/i;

// ─── Service ────────────────────────────────────────────────

export class ClarifyingQuestionsService {

  /**
   * Get missing P0-P2 fields from the collected entities.
   */
  getMissingRequiredFields(entities: Record<string, unknown>): string[] {
    const missing: string[] = [];
    for (const field of CLARIFYING_REQUIRED_FIELDS) {
      if (field === 'event_type' && !entities.event_type) missing.push(field);
      if (field === 'budget' && !entities.budget && !entities.budget_max_paise) missing.push(field);
      if (field === 'date' && !entities.date && !entities.event_date) missing.push(field);
    }
    return missing;
  }

  /**
   * Select which questions to ask this round.
   */
  selectQuestions(missingFields: string[], alreadyAsked: string[], max: number = CLARIFYING_MAX_QUESTIONS_PER_ROUND): ClarifyingQuestion[] {
    return missingFields
      .filter((f) => !alreadyAsked.includes(f))
      .slice(0, max)
      .map((f) => FIELD_TEMPLATES[f])
      .filter(Boolean);
  }

  /**
   * Build acknowledgment text from what we already know.
   */
  buildAcknowledgment(entities: Record<string, unknown>): string {
    const parts: string[] = [];
    if (entities.genre) parts.push(`a ${entities.genre} artist`);
    else if (entities.artist_name) parts.push(String(entities.artist_name));
    else parts.push('entertainment');

    if (entities.audience_size) parts.push(`for ${entities.audience_size} people`);
    if (entities.city) parts.push(`in ${entities.city}`);
    if (entities.event_type) parts.push(`(${entities.event_type})`);

    return `Got it — ${parts.join(' ')}! A couple of quick questions to find the best match:`;
  }

  /**
   * Check if user wants to skip clarifying.
   */
  isSkipRequest(text: string): boolean {
    return SKIP_PATTERNS.test(text.trim());
  }

  /**
   * Determine if we have enough info to proceed with recommendations.
   */
  hasEnoughInfo(entities: Record<string, unknown>, rounds: number, skipped: boolean): boolean {
    const hasEventType = !!entities.event_type;
    const hasBudget = !!(entities.budget || entities.budget_max_paise);
    const hasDate = !!(entities.date || entities.event_date);

    // All three → always proceed
    if (hasEventType && hasBudget && hasDate) return true;

    // 2 of 3 after at least 1 round → good enough
    if ([hasEventType, hasBudget, hasDate].filter(Boolean).length >= 2 && rounds >= 1) return true;

    // User explicitly skipped
    if (skipped) return true;

    // Hit max rounds
    if (rounds >= CLARIFYING_MAX_ROUNDS) return true;

    return false;
  }

  /**
   * Merge entities from a clarifying answer into the collected set.
   * Re-parses the answer text through the intent parser to extract entities.
   */
  async mergeEntities(
    existing: Record<string, unknown>,
    answerText: string,
  ): Promise<Record<string, unknown>> {
    const merged = { ...existing };

    // For short clarifying answers (chips like "next week", "wedding", "50k"),
    // avoid any expensive parsing. If parsing fails for any reason, we still
    // proceed with chip heuristics below.
    let parsedEntities: Record<string, unknown> = {};
    const lower = answerText.toLowerCase().trim();
    const looksLikeChip = lower.length <= 32
      && (/^(this_week|next_week|this_month|next_month|skip)$/.test(lower)
        || /(this week|next week|this month|next month)\b/.test(lower)
        || /\b(wedding|shaadi|shadi|corporate|college|concert|festival|party)\b/.test(lower)
        || /[0-9]/.test(lower));

    if (!looksLikeChip) {
      try {
        const parsed = await voiceIntentService.parseQuery(answerText);
        parsedEntities = parsed.entities as unknown as Record<string, unknown>;
      } catch {
        parsedEntities = {};
      }
    }

    // Merge extracted entities (only non-null)
    for (const [key, val] of Object.entries(parsedEntities)) {
      if (val !== undefined && val !== null) {
        merged[key] = val;
      }
    }

    // Handle option chip values directly (e.g., "wedding", "50000")
    // lower defined above

    // Event type from chip tap
    if (!merged.event_type) {
      const eventTypes: Record<string, string> = {
        'wedding': 'wedding', 'sangeet': 'wedding', 'shaadi': 'wedding',
        'corporate': 'corporate', 'college': 'college_event', 'college fest': 'college_event',
        'house party': 'private_party', 'party': 'private_party',
        'concert': 'concert', 'festival': 'concert',
      };
      for (const [kw, val] of Object.entries(eventTypes)) {
        if (lower.includes(kw)) { merged.event_type = val; break; }
      }
    }

    // Budget from chip tap (numeric value as text)
    if (!merged.budget && !merged.budget_max_paise) {
      const num = Number(lower.replace(/[^0-9]/g, ''));
      if (num > 0) {
        // If it looks like paise (>= 100000), it's from a chip
        merged.budget = num >= 100000 ? num / 100 : num;
      }
    }

    // Date from chip shorthand
    if (!merged.date && !merged.event_date) {
      const now = new Date();
      if (lower === 'this_week' || lower.includes('this week')) {
        const end = new Date(now); end.setDate(now.getDate() + 7);
        merged.date = end.toISOString().slice(0, 10);
      } else if (lower === 'next_week' || lower.includes('next week')) {
        const end = new Date(now); end.setDate(now.getDate() + 14);
        merged.date = end.toISOString().slice(0, 10);
      } else if (lower === 'this_month' || lower.includes('this month')) {
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        merged.date = end.toISOString().slice(0, 10);
      } else if (lower === 'next_month' || lower.includes('next month')) {
        const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        merged.date = end.toISOString().slice(0, 10);
      }
    }

    return merged;
  }

  /**
   * Create the initial clarifying state from a parsed intent.
   */
  createInitialState(rawText: string, entities: Record<string, unknown>): ClarifyingState {
    return {
      phase: 'collecting',
      original_query: rawText,
      collected_entities: { ...entities },
      asked_fields: [],
      clarifying_rounds: 0,
      user_skipped: false,
    };
  }
}

export const clarifyingQuestionsService = new ClarifyingQuestionsService();
