import { db } from '../../infrastructure/database.js';

export class VoiceQueryRepository {
  // ─── Conversations ────────────────────────────────────────

  async createConversation(userId: string) {
    const [row] = await db('voice_conversations')
      .insert({
        user_id: userId,
        session_state: '{}',
        is_active: true,
      })
      .returning('*');
    return row;
  }

  async getConversation(id: string) {
    return db('voice_conversations').where({ id }).first();
  }

  async getActiveConversation(userId: string) {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
    return db('voice_conversations')
      .where({ user_id: userId, is_active: true })
      .where('last_message_at', '>=', cutoff)
      .orderBy('last_message_at', 'desc')
      .first();
  }

  async updateConversation(id: string, data: Record<string, unknown>) {
    const [row] = await db('voice_conversations')
      .where({ id })
      .update({ ...data, last_message_at: new Date(), updated_at: new Date() })
      .returning('*');
    return row;
  }

  async deactivateConversation(id: string) {
    const [row] = await db('voice_conversations')
      .where({ id })
      .update({ is_active: false, updated_at: new Date() })
      .returning('*');
    return row;
  }

  async getUserConversations(userId: string, limit = 20) {
    return db('voice_conversations')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  // ─── Messages ─────────────────────────────────────────────

  async addMessage(data: {
    conversation_id: string;
    direction: 'inbound' | 'outbound';
    content: string;
    parsed_intent?: string;
    parsed_entities?: Record<string, unknown>;
    confidence?: number;
  }) {
    const [row] = await db('voice_messages')
      .insert({
        conversation_id: data.conversation_id,
        direction: data.direction,
        content: data.content,
        parsed_intent: data.parsed_intent || null,
        parsed_entities: data.parsed_entities ? JSON.stringify(data.parsed_entities) : null,
        confidence: data.confidence ?? null,
      })
      .returning('*');
    return row;
  }

  async getMessages(conversationId: string, limit = 50) {
    return db('voice_messages')
      .where({ conversation_id: conversationId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  }
}

export const voiceQueryRepository = new VoiceQueryRepository();
