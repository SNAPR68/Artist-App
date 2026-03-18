/**
 * Voice Query orchestrator: manages conversation state, enriches context,
 * and delegates to intent parsing + execution services.
 */

import { db } from '../../infrastructure/database.js';
import { VOICE_QUERY_CONFIDENCE_THRESHOLD, VOICE_SESSION_TIMEOUT_MINUTES } from '@artist-booking/shared';
import { voiceQueryRepository } from './voice-query.repository.js';
import { voiceIntentService } from './voice-intent.service.js';
import { voiceExecutionService } from './voice-execution.service.js';
import type { VoiceExecutionResult } from './voice-execution.service.js';

// ─── Error class ────────────────────────────────────────────

export class VoiceQueryError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'VoiceQueryError';
  }
}

// ─── Types ──────────────────────────────────────────────────

interface VoiceQueryResult extends VoiceExecutionResult {
  session_id: string;
  intent: string;
  confidence: number;
}

// ─── Role-based suggestions ─────────────────────────────────

const ROLE_SUGGESTIONS: Record<string, string[]> = {
  artist: [
    'Check my earnings',
    "What's demand looking like?",
    'Show my upcoming bookings',
  ],
  client: [
    'Find artists for my event',
    'Check booking status',
    'Show recommendations',
  ],
  agent: [
    'Show pipeline',
    'Find artists for client',
    'Check booking status',
  ],
  event_company: [
    'Show pipeline',
    'Find artists for event',
    'Check workspace bookings',
  ],
  admin: [
    'Show platform stats',
    'Check recent bookings',
    'Find artists',
  ],
};

// ─── Service ────────────────────────────────────────────────

export class VoiceQueryService {
  /**
   * Process a voice query: parse intent, execute, manage conversation state.
   */
  async processQuery(userId: string, text: string, sessionId?: string): Promise<VoiceQueryResult> {
    // 1. Get or create conversation
    let conversation: Record<string, unknown> | undefined;

    if (sessionId) {
      conversation = await voiceQueryRepository.getConversation(sessionId);
      if (conversation && conversation.user_id !== userId) {
        throw new VoiceQueryError('SESSION_NOT_FOUND', 'Session not found', 404);
      }
      if (conversation && !conversation.is_active) {
        // Reactivate if within timeout
        const lastMessage = conversation.last_message_at
          ? new Date(conversation.last_message_at as string).getTime()
          : 0;
        const withinTimeout = Date.now() - lastMessage < VOICE_SESSION_TIMEOUT_MINUTES * 60 * 1000;

        if (withinTimeout) {
          conversation = await voiceQueryRepository.updateConversation(sessionId, { is_active: true });
        } else {
          conversation = undefined; // Create new
        }
      }
    }

    if (!conversation) {
      conversation = await voiceQueryRepository.getActiveConversation(userId);
    }

    if (!conversation) {
      conversation = await voiceQueryRepository.createConversation(userId);
    }

    const conversationId = conversation!.id as string;

    // 2. Parse intent
    const parsed = await voiceIntentService.parseQuery(text);

    // 3. Check confidence threshold
    if (parsed.confidence < VOICE_QUERY_CONFIDENCE_THRESHOLD) {
      // Store the message anyway for learning
      await voiceQueryRepository.addMessage({
        conversation_id: conversationId,
        direction: 'inbound',
        content: text,
        parsed_intent: parsed.intent,
        parsed_entities: parsed.entities,
        confidence: parsed.confidence,
      });

      const lowConfResponse = "I'm not sure what you're looking for. Could you rephrase? Try something like 'Find me a DJ for a wedding in Mumbai' or 'Check booking status'.";

      await voiceQueryRepository.addMessage({
        conversation_id: conversationId,
        direction: 'outbound',
        content: lowConfResponse,
      });

      return {
        session_id: conversationId,
        intent: parsed.intent,
        confidence: parsed.confidence,
        response_text: lowConfResponse,
        suggestions: [
          'Find artists for my event',
          'Check booking status',
          'Show my earnings',
        ],
      };
    }

    // 4. Enrich context: load user profile
    const user = await db('users').where({ id: userId }).first();
    const sessionState = typeof conversation!.session_state === 'string'
      ? JSON.parse(conversation!.session_state as string)
      : conversation!.session_state || {};

    const conversationContext = {
      session_state: {
        ...sessionState,
        user_role: user?.role,
      },
      previous_intents: sessionState.previous_intents || [],
    };

    // 5. Store inbound message
    await voiceQueryRepository.addMessage({
      conversation_id: conversationId,
      direction: 'inbound',
      content: text,
      parsed_intent: parsed.intent,
      parsed_entities: parsed.entities,
      confidence: parsed.confidence,
    });

    // 6. Execute
    const result = await voiceExecutionService.execute(parsed, userId, conversationContext);

    // 7. Update conversation state
    const previousIntents = conversationContext.previous_intents.slice(-9); // Keep last 10
    previousIntents.push(parsed.intent);

    await voiceQueryRepository.updateConversation(conversationId, {
      current_intent: parsed.intent,
      session_state: JSON.stringify({
        ...sessionState,
        ...parsed.entities,
        last_intent: parsed.intent,
        previous_intents: previousIntents,
        user_role: user?.role,
      }),
    });

    // 8. Store outbound message
    await voiceQueryRepository.addMessage({
      conversation_id: conversationId,
      direction: 'outbound',
      content: result.response_text,
    });

    // 9. Return result
    return {
      session_id: conversationId,
      intent: parsed.intent,
      confidence: parsed.confidence,
      ...result,
    };
  }

  /**
   * Get a session by ID, verifying ownership.
   */
  async getSession(sessionId: string, userId: string) {
    const conversation = await voiceQueryRepository.getConversation(sessionId);

    if (!conversation || conversation.user_id !== userId) {
      throw new VoiceQueryError('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const messages = await voiceQueryRepository.getMessages(sessionId);

    return {
      ...conversation,
      messages,
    };
  }

  /**
   * List sessions for a user.
   */
  async getSessions(userId: string, limit = 20) {
    return voiceQueryRepository.getUserConversations(userId, limit);
  }

  /**
   * End (deactivate) a session.
   */
  async endSession(sessionId: string, userId: string) {
    const conversation = await voiceQueryRepository.getConversation(sessionId);

    if (!conversation || conversation.user_id !== userId) {
      throw new VoiceQueryError('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    return voiceQueryRepository.deactivateConversation(sessionId);
  }

  /**
   * Get context-aware quick-action suggestions based on user role.
   */
  async getSuggestions(userId: string): Promise<string[]> {
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      throw new VoiceQueryError('USER_NOT_FOUND', 'User not found', 404);
    }

    return ROLE_SUGGESTIONS[user.role] || ROLE_SUGGESTIONS.client;
  }
}

export const voiceQueryService = new VoiceQueryService();
