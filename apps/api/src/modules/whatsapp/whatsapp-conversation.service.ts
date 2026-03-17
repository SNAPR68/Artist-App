import { whatsAppRepository } from './whatsapp.repository.js';
import { whatsAppIntentService } from './whatsapp-intent.service.js';
import { whatsAppProviderService } from './whatsapp-provider.service.js';
import { db } from '../../infrastructure/database.js';
import { WHATSAPP_SESSION_TIMEOUT_HOURS } from '@artist-booking/shared';

/**
 * Conversation state machine for WhatsApp booking flow.
 */
export class WhatsAppConversationService {
  /**
   * Handle an inbound message from the webhook.
   */
  async handleInboundMessage(phoneNumber: string, content: string, providerMessageId?: string) {
    // Get or create conversation
    const conversation = await whatsAppRepository.findOrCreateConversation(phoneNumber);

    // Parse intent
    const parsed = await whatsAppIntentService.parseMessage(content);

    // Store inbound message
    await whatsAppRepository.addMessage({
      conversation_id: conversation.id,
      direction: 'inbound',
      message_type: 'text',
      content,
      parsed_intent: parsed.intent,
      parsed_entities: parsed.entities,
      provider_message_id: providerMessageId,
      status: 'received',
    });

    // Link user if not already linked
    if (!conversation.user_id) {
      const user = await db('users').where({ phone: phoneNumber }).first();
      if (user) {
        await whatsAppRepository.linkUser(conversation.id, user.id);
      }
    }

    // Update conversation intent
    await whatsAppRepository.updateConversation(conversation.id, {
      current_intent: parsed.intent,
      conversation_state: JSON.stringify({
        ...(typeof conversation.conversation_state === 'string'
          ? JSON.parse(conversation.conversation_state)
          : conversation.conversation_state),
        ...parsed.entities,
        last_intent: parsed.intent,
      }),
    });

    // Generate and send response
    const response = await this.generateResponse(conversation, parsed);

    // Store outbound message
    const providerMsgId = await whatsAppProviderService.sendText(phoneNumber, response);
    await whatsAppRepository.addMessage({
      conversation_id: conversation.id,
      direction: 'outbound',
      message_type: 'text',
      content: response,
      provider_message_id: providerMsgId,
    });

    return { conversation_id: conversation.id, intent: parsed.intent, response };
  }

  private async generateResponse(
    conversation: Record<string, unknown>,
    parsed: { intent: string; entities: Record<string, unknown>; confidence: number },
  ): Promise<string> {
    const state = typeof conversation.conversation_state === 'string'
      ? JSON.parse(conversation.conversation_state as string)
      : conversation.conversation_state || {};

    switch (parsed.intent) {
      case 'search_artist':
        return this.handleSearchFlow(state, parsed.entities);

      case 'check_availability':
        return this.handleAvailabilityFlow(state, parsed.entities);

      case 'get_quote':
        return this.handleQuoteFlow(state, parsed.entities);

      case 'check_status':
        return this.handleStatusFlow(conversation, parsed.entities);

      case 'general_question':
        return 'Thanks for reaching out! I can help you:\n\n'
          + '1. Find and book artists\n'
          + '2. Check artist availability\n'
          + '3. Get price quotes\n'
          + '4. Check booking status\n\n'
          + 'Just tell me what you need!';

      default:
        return 'Welcome! I can help you find and book artists for your event. 🎵\n\n'
          + 'Try saying:\n'
          + '• "I need a DJ for my wedding in Mumbai on March 25"\n'
          + '• "Is [artist name] available on April 10?"\n'
          + '• "What\'s the status of my booking?"\n\n'
          + 'What would you like to do?';
    }
  }

  private async handleSearchFlow(state: Record<string, unknown>, entities: Record<string, unknown>): Promise<string> {
    const missing: string[] = [];
    if (!entities.city && !state.city) missing.push('city');
    if (!entities.date && !state.date) missing.push('date');

    if (missing.length > 0) {
      return `I can help you find an artist! I just need a few details:\n\n`
        + missing.map(m => `• What ${m} is the event in?`).join('\n');
    }

    // We have enough info — search
    const city = (entities.city || state.city) as string;
    const results = await db('artist_profiles')
      .where('base_city', 'ilike', `%${city}%`)
      .where('deleted_at', null)
      .orderBy('trust_score', 'desc')
      .limit(5)
      .select('stage_name', 'genres', 'trust_score', 'base_city');

    if (results.length === 0) {
      return `Sorry, I couldn't find any artists in ${city} right now. Try a different city or date!`;
    }

    let response = `Here are the top artists in ${city}:\n\n`;
    results.forEach((a: Record<string, unknown>, i: number) => {
      const genres = Array.isArray(a.genres) ? a.genres.slice(0, 2).join(', ') : '';
      response += `${i + 1}. ${a.stage_name} — ${genres} (Trust: ${a.trust_score})\n`;
    });
    response += '\nReply with a number to inquire, or tell me more about your event!';

    return response;
  }

  private async handleAvailabilityFlow(state: Record<string, unknown>, entities: Record<string, unknown>): Promise<string> {
    if (!entities.date && !state.date) {
      return 'What date would you like to check? (e.g., "March 25" or "2026-04-10")';
    }

    return `To check availability, please visit our platform or send the artist's name and date. Our team will get back to you shortly!`;
  }

  private async handleQuoteFlow(_state: Record<string, unknown>, entities: Record<string, unknown>): Promise<string> {
    if (entities.booking_id) {
      const booking = await db('bookings').where({ id: entities.booking_id }).first();
      if (booking && booking.agreed_amount) {
        return `Booking ${(entities.booking_id as string).slice(0, 8)}...: The agreed amount is ₹${(Number(booking.agreed_amount) / 100).toLocaleString('en-IN')}.`;
      }
    }

    return 'To get a price quote, tell me:\n\n• What type of event?\n• What city?\n• What date?\n• Any budget preference?';
  }

  private async handleStatusFlow(conversation: Record<string, unknown>, entities: Record<string, unknown>): Promise<string> {
    const userId = conversation.user_id as string;
    if (!userId) {
      if (entities.booking_id) {
        const booking = await db('bookings').where({ id: entities.booking_id }).first();
        if (booking) {
          return `Booking ${(entities.booking_id as string).slice(0, 8)}... is currently: *${booking.state}*`;
        }
      }
      return 'I need to verify your identity first. Please share your booking ID, or log in to our platform for full details.';
    }

    // Get recent bookings for this user
    const bookings = await db('bookings')
      .where(function () {
        this.where('client_id', userId);
      })
      .orderBy('created_at', 'desc')
      .limit(3)
      .select('id', 'event_type', 'event_date', 'state');

    if (bookings.length === 0) {
      return "You don't have any bookings yet. Would you like to search for an artist?";
    }

    let response = 'Your recent bookings:\n\n';
    for (const b of bookings) {
      response += `• ${b.event_type} on ${b.event_date}: *${b.state}*\n`;
    }
    return response;
  }

  /**
   * Expire old conversations. Run as cron.
   */
  async expireConversations(): Promise<number> {
    return whatsAppRepository.expireOldConversations(WHATSAPP_SESSION_TIMEOUT_HOURS);
  }
}

export const whatsAppConversationService = new WhatsAppConversationService();
