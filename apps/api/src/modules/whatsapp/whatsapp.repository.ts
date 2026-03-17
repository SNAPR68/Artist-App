import { db } from '../../infrastructure/database.js';

export class WhatsAppRepository {
  // ─── Conversations ────────────────────────────────────────
  async findOrCreateConversation(phoneNumber: string) {
    const existing = await db('whatsapp_conversations')
      .where({ phone_number: phoneNumber })
      .first();

    if (existing) {
      // Reactivate if expired
      if (!existing.is_active) {
        const [reactivated] = await db('whatsapp_conversations')
          .where({ id: existing.id })
          .update({ is_active: true, conversation_state: '{}', current_intent: null, updated_at: new Date() })
          .returning('*');
        return reactivated;
      }
      return existing;
    }

    const [row] = await db('whatsapp_conversations')
      .insert({ phone_number: phoneNumber })
      .returning('*');
    return row;
  }

  async updateConversation(id: string, data: Record<string, unknown>) {
    const [row] = await db('whatsapp_conversations')
      .where({ id })
      .update({ ...data, last_message_at: new Date(), updated_at: new Date() })
      .returning('*');
    return row;
  }

  async linkUser(conversationId: string, userId: string) {
    const [row] = await db('whatsapp_conversations')
      .where({ id: conversationId })
      .update({ user_id: userId, updated_at: new Date() })
      .returning('*');
    return row;
  }

  async getConversation(id: string) {
    return db('whatsapp_conversations').where({ id }).first();
  }

  async listActiveConversations(page: number, perPage: number) {
    const offset = (page - 1) * perPage;
    const [countResult] = await db('whatsapp_conversations').where({ is_active: true }).count('* as total');
    const total = Number(countResult.total);

    const rows = await db('whatsapp_conversations')
      .where({ is_active: true })
      .orderBy('last_message_at', 'desc')
      .limit(perPage)
      .offset(offset);

    return {
      data: rows,
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    };
  }

  async expireOldConversations(hoursAgo: number): Promise<number> {
    const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    return db('whatsapp_conversations')
      .where('is_active', true)
      .where('last_message_at', '<', cutoff)
      .update({ is_active: false, updated_at: new Date() });
  }

  // ─── Messages ─────────────────────────────────────────────
  async addMessage(data: {
    conversation_id: string;
    direction: string;
    message_type: string;
    content: string;
    parsed_intent?: string;
    parsed_entities?: Record<string, unknown>;
    provider_message_id?: string;
    status?: string;
  }) {
    const [row] = await db('whatsapp_messages')
      .insert({
        conversation_id: data.conversation_id,
        direction: data.direction,
        message_type: data.message_type,
        content: data.content,
        parsed_intent: data.parsed_intent || null,
        parsed_entities: data.parsed_entities ? JSON.stringify(data.parsed_entities) : null,
        provider_message_id: data.provider_message_id || null,
        status: data.status || 'sent',
      })
      .returning('*');
    return row;
  }

  async getMessages(conversationId: string, limit = 50) {
    return db('whatsapp_messages')
      .where({ conversation_id: conversationId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  }
}

export const whatsAppRepository = new WhatsAppRepository();
