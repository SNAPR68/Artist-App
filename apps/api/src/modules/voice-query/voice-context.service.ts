/**
 * Voice Context Service — Multi-turn conversation memory.
 * Handles entity carry-forward, reference resolution, and conversation state.
 */

import { db } from '../../infrastructure/database.js';
import type { VoiceParsedIntent } from './voice-intent.service.js';
import type { VoiceConversationMemory } from '@artist-booking/shared';

// ─── Types ──────────────────────────────────────────────────

export interface EnrichedQuery extends VoiceParsedIntent {
  resolved_entities: VoiceParsedIntent['entities'];
  resolved_artist_id?: string;
  resolved_brief_id?: string;
  context_used: boolean;
}

// ─── Reference Patterns ─────────────────────────────────────

const ORDINAL_MAP: Record<string, number> = {
  'first': 0, 'first one': 0, '1st': 0, 'number 1': 0, 'pehla': 0,
  'second': 1, 'second one': 1, '2nd': 1, 'number 2': 1, 'doosra': 1,
  'third': 2, 'third one': 2, '3rd': 2, 'number 3': 2, 'teesra': 2,
  'fourth': 3, 'fourth one': 3, '4th': 3, 'number 4': 3,
  'fifth': 4, 'fifth one': 4, '5th': 4, 'number 5': 4,
  'top pick': 0, 'top one': 0, 'best one': 0, 'top': 0,
  'last one': -1, 'last': -1,
};

const PRONOUN_PATTERNS = /\b(them|that one|this one|that artist|this artist|the same one|usse|usko|isko|unko|woh|ye|yeh)\b/i;

const COMPARATIVE_MAP: Record<string, { field: string; direction: 'lower' | 'higher' }> = {
  'cheaper': { field: 'budget', direction: 'lower' },
  'sasta': { field: 'budget', direction: 'lower' },
  'budget friendly': { field: 'budget', direction: 'lower' },
  'less expensive': { field: 'budget', direction: 'lower' },
  'more expensive': { field: 'budget', direction: 'higher' },
  'premium': { field: 'budget', direction: 'higher' },
  'mehenga': { field: 'budget', direction: 'higher' },
  'closer': { field: 'logistics', direction: 'lower' },
  'nearby': { field: 'logistics', direction: 'lower' },
  'more experienced': { field: 'reliability', direction: 'higher' },
  'experienced': { field: 'reliability', direction: 'higher' },
  'higher rated': { field: 'reliability', direction: 'higher' },
};

const CONFIRMATION_PATTERNS = /^(yes|yeah|yep|sure|ok|okay|haan|ha|ji|theek hai|perfect|done|do it|kar do|book karo|go ahead|proceed|confirm)$/i;

// ─── Service ────────────────────────────────────────────────

export class VoiceContextService {
  /**
   * Load conversation memory from DB.
   */
  async getMemory(conversationId: string): Promise<VoiceConversationMemory | null> {
    const convo = await db('voice_conversations')
      .where({ id: conversationId })
      .first('conversation_memory');
    if (!convo?.conversation_memory) return null;
    return typeof convo.conversation_memory === 'string'
      ? JSON.parse(convo.conversation_memory)
      : convo.conversation_memory;
  }

  /**
   * Save conversation memory to DB.
   */
  async saveMemory(conversationId: string, memory: VoiceConversationMemory): Promise<void> {
    await db('voice_conversations')
      .where({ id: conversationId })
      .update({
        conversation_memory: JSON.stringify(memory),
        updated_at: db.fn.now(),
      });
  }

  /**
   * Enrich a parsed query with context from conversation memory.
   * Handles: entity carry-forward, reference resolution, confirmations.
   */
  async enrichQuery(
    conversationId: string,
    parsed: VoiceParsedIntent,
  ): Promise<EnrichedQuery> {
    const memory = await this.getMemory(conversationId);

    if (!memory) {
      return {
        ...parsed,
        resolved_entities: { ...parsed.entities },
        context_used: false,
      };
    }

    const lower = parsed.raw_text.toLowerCase();
    const resolvedEntities = { ...parsed.entities };
    let resolvedArtistId: string | undefined;
    let resolvedBriefId: string | undefined;
    let contextUsed = false;

    // 1. Check for confirmation of pending action
    if (CONFIRMATION_PATTERNS.test(lower.trim()) && memory.pending_action) {
      return {
        ...parsed,
        intent: 'ACTION',
        resolved_entities: {
          ...resolvedEntities,
          action_verb: memory.pending_action.type,
          booking_id: memory.pending_action.booking_id,
        },
        resolved_artist_id: memory.pending_action.artist_id,
        resolved_brief_id: memory.pending_action.brief_id,
        context_used: true,
      };
    }

    // 2. Ordinal reference resolution ("the first one", "top pick")
    for (const [pattern, index] of Object.entries(ORDINAL_MAP)) {
      if (lower.includes(pattern) && memory.last_results?.items.length) {
        const items = memory.last_results.items;
        const resolvedIndex = index === -1 ? items.length - 1 : index;
        if (resolvedIndex < items.length) {
          resolvedArtistId = items[resolvedIndex];
          resolvedBriefId = memory.last_results.brief_id;
          contextUsed = true;
          break;
        }
      }
    }

    // 3. Pronoun reference ("book them", "tell me about that one")
    if (!resolvedArtistId && PRONOUN_PATTERNS.test(lower) && memory.last_results?.items.length) {
      resolvedArtistId = memory.last_results.items[0]; // Default to first/most recent
      resolvedBriefId = memory.last_results.brief_id;
      contextUsed = true;
    }

    // 4. Comparative modifier ("cheaper", "more experienced")
    for (const [keyword, modifier] of Object.entries(COMPARATIVE_MAP)) {
      if (lower.includes(keyword)) {
        // Carry forward all entities from previous search + modify the target field
        if (memory.carried_entities) {
          if (!resolvedEntities.city && memory.carried_entities.city) {
            resolvedEntities.city = memory.carried_entities.city;
          }
          if (!resolvedEntities.event_type && memory.carried_entities.event_type) {
            resolvedEntities.event_type = memory.carried_entities.event_type;
          }
          // Adjust budget for comparative
          if (modifier.field === 'budget' && memory.carried_entities.budget_max_paise) {
            const currentBudget = memory.carried_entities.budget_max_paise;
            resolvedEntities.budget = modifier.direction === 'lower'
              ? Math.round(currentBudget * 0.6 / 100)  // 60% of previous, convert paise to rupees
              : Math.round(currentBudget * 1.5 / 100);  // 150% of previous
          }
          contextUsed = true;
        }
        break;
      }
    }

    // 5. Entity carry-forward (city, event_type, budget, date persist)
    if (memory.carried_entities) {
      if (!resolvedEntities.city && memory.carried_entities.city) {
        resolvedEntities.city = memory.carried_entities.city;
        contextUsed = true;
      }
      if (!resolvedEntities.event_type && memory.carried_entities.event_type) {
        resolvedEntities.event_type = memory.carried_entities.event_type;
        contextUsed = true;
      }
      if (!resolvedEntities.date && memory.carried_entities.event_date) {
        resolvedEntities.date = memory.carried_entities.event_date;
        contextUsed = true;
      }
      if (!resolvedEntities.budget && memory.carried_entities.budget_max_paise) {
        resolvedEntities.budget = memory.carried_entities.budget_max_paise / 100;
        contextUsed = true;
      }
    }

    return {
      ...parsed,
      resolved_entities: resolvedEntities,
      resolved_artist_id: resolvedArtistId,
      resolved_brief_id: resolvedBriefId,
      context_used: contextUsed,
    };
  }

  /**
   * Update conversation memory after a response.
   */
  async updateMemoryAfterResponse(
    conversationId: string,
    parsed: VoiceParsedIntent,
    result: {
      artist_ids?: string[];
      brief_id?: string;
      result_type?: 'discover' | 'recommendations' | 'bookings' | 'earnings';
      pending_action?: VoiceConversationMemory['pending_action'];
    },
  ): Promise<void> {
    const memory = (await this.getMemory(conversationId)) || {
      carried_entities: {},
    };

    // Update carried entities from current query
    const { city, event_type, budget, date, genre } = parsed.entities;
    if (city) memory.carried_entities.city = city;
    if (event_type) memory.carried_entities.event_type = event_type;
    if (budget) memory.carried_entities.budget_max_paise = Math.round(budget * 100);
    if (date) memory.carried_entities.event_date = date;
    if (genre) memory.carried_entities.genres = [genre];

    // Update last results
    if (result.artist_ids && result.artist_ids.length > 0) {
      memory.last_results = {
        type: result.result_type || 'discover',
        items: result.artist_ids,
        brief_id: result.brief_id,
      };
    }

    // Update pending action
    if (result.pending_action) {
      memory.pending_action = result.pending_action;
    } else {
      // Clear pending action after non-confirmation responses
      memory.pending_action = undefined;
    }

    await this.saveMemory(conversationId, memory);
  }
}

export const voiceContextService = new VoiceContextService();
