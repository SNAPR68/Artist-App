import { whatsAppRepository } from './whatsapp.repository.js';
import { whatsAppIntentService } from './whatsapp-intent.service.js';
import { whatsAppProviderService } from './whatsapp-provider.service.js';
import { db } from '../../infrastructure/database.js';
import { WHATSAPP_SESSION_TIMEOUT_HOURS } from '@artist-booking/shared';
import { decisionEngineService } from '../decision-engine/decision-engine.service.js';
import { decisionEngineConversationService } from '../decision-engine/decision-engine-conversation.service.js';
import { callSheetService } from '../event-file/call-sheet.service.js';
import { config } from '../../config/index.js';

/** Parse a short reply for YES/NO/DELAYED/HELP intent. */
function parseShortReply(text: string): 'yes' | 'no' | 'delayed' | 'help' | null {
  const t = text.trim().toLowerCase();
  if (/^(yes|y|confirmed?|ok|okay|haan|ha|👍|✅)$/i.test(t)) return 'yes';
  if (/^(no|n|cannot|can't|cant|decline|nahi|nahin|❌)$/i.test(t)) return 'no';
  if (/^(delay|delayed|late|running late)$/i.test(t)) return 'delayed';
  if (/^(help|sos|urgent|issue|problem)$/i.test(t)) return 'help';
  return null;
}

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

    // Short-circuit: vendor call-sheet confirmation YES/NO, or day-of check-in.
    // Runs BEFORE decision-engine intent parsing — template replies should
    // never be interpreted as search briefs.
    const shortReply = parseShortReply(content);
    if (shortReply) {
      // 1) Day-of check-in takes priority if there's an active one.
      //    Reason: a confirmed vendor who already said YES yesterday may reply
      //    YES again on the morning of the event — that's an on-track signal,
      //    not a re-confirmation.
      if (shortReply === 'yes' || shortReply === 'delayed' || shortReply === 'help') {
        const pendingCheckin = await callSheetService.findPendingCheckinByPhone(phoneNumber);
        if (pendingCheckin) {
          const status = shortReply === 'yes' ? 'on_track' : shortReply;
          await callSheetService.recordVendorCheckin(pendingCheckin.roster_id, status, content);

          await whatsAppRepository.addMessage({
            conversation_id: conversation.id,
            direction: 'inbound',
            message_type: 'text',
            content,
            parsed_intent: `day_of_checkin_${status}`,
            parsed_entities: { event_file_id: pendingCheckin.event_file_id },
            provider_message_id: providerMessageId,
            status: 'received',
          });

          const ack =
            status === 'on_track'
              ? 'On track — thanks. See you on site.'
              : status === 'delayed'
                ? 'Got it — flagged as delayed. The production team has been alerted.'
                : 'Help flagged. Production lead will call you in under 5 minutes.';

          const outboundId = await whatsAppProviderService.sendText(phoneNumber, ack);
          await whatsAppRepository.addMessage({
            conversation_id: conversation.id,
            direction: 'outbound',
            message_type: 'text',
            content: ack,
            provider_message_id: outboundId,
          });

          return { conversation_id: conversation.id, intent: 'day_of_checkin', response: ack };
        }
      }

      // 2) Otherwise fall through to confirmation YES/NO.
      if (shortReply === 'yes' || shortReply === 'no') {
        const pending = await callSheetService.findPendingByPhone(phoneNumber);
        if (pending?.confirmation_token) {
          await callSheetService.recordVendorResponse(
            pending.confirmation_token,
            shortReply === 'yes' ? 'confirmed' : 'declined',
            content,
          );

          await whatsAppRepository.addMessage({
            conversation_id: conversation.id,
            direction: 'inbound',
            message_type: 'text',
            content,
            parsed_intent: shortReply === 'yes' ? 'vendor_confirm_yes' : 'vendor_confirm_no',
            parsed_entities: { event_file_id: pending.event_file_id },
            provider_message_id: providerMessageId,
            status: 'received',
          });

          const ack = shortReply === 'yes'
            ? 'Confirmed. Thanks — call sheet and day-of check-in will land here.'
            : 'Got it — marked as declined. The production team will be in touch.';

          const outboundId = await whatsAppProviderService.sendText(phoneNumber, ack);
          await whatsAppRepository.addMessage({
            conversation_id: conversation.id,
            direction: 'outbound',
            message_type: 'text',
            content: ack,
            provider_message_id: outboundId,
          });

          return { conversation_id: conversation.id, intent: 'vendor_confirm', response: ack };
        }
      }
    }

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
        __last_inbound_text: content,
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

      case 'create_brief':
        return this.handleBriefFlow(conversation, parsed.entities);

      case 'decision_proposal':
        return this.handleDecisionProposal(conversation);

      case 'decision_lock':
        return this.handleDecisionLock(conversation, parsed.entities);

      case 'decision_refine':
        return this.handleDecisionRefine(conversation);

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

  private async handleBriefFlow(conversation: Record<string, unknown>, entities: Record<string, unknown>): Promise<string> {
    try {
      const userId = conversation.user_id as string | null;
      const state = typeof conversation.conversation_state === 'string'
        ? JSON.parse(conversation.conversation_state as string)
        : (conversation.conversation_state || {});

      const rawText = (state.__last_inbound_text as string | undefined)
        ?? this.buildRawTextFallback(entities);

      // PRD rule: ask at most ONE clarifying question on WhatsApp.
      const alreadyAsked = Boolean(state.__decision_clarifier_asked);
      const existingSessionId = state.__decision_session_id as string | undefined;

      if (!alreadyAsked) {
        const convo = await decisionEngineConversationService.handleMessage({
          raw_text: rawText,
          source: 'whatsapp',
          session_id: existingSessionId ?? null,
          user_id: userId ?? null,
          city: entities.city as string | undefined,
          event_date: entities.date as string | undefined,
          budget_max_paise: entities.budget ? Number(entities.budget) * 100 : undefined,
          genres: entities.genre ? [String(entities.genre)] : undefined,
        });

        if (convo.response_type === 'clarifying_questions' && convo.clarifying_questions.length > 0) {
          await whatsAppRepository.updateConversation(conversation.id as string, {
            conversation_state: JSON.stringify({
              ...state,
              __decision_session_id: convo.session_id,
              __decision_clarifier_asked: true,
              __decision_last_action: 'awaiting_clarifier',
            }),
          });

          const q = convo.clarifying_questions[0];
          const prompt = (q as any).question_en || 'One quick question:';
          const opts = (q as any).options?.map((o: any) => o.label_en).filter(Boolean);
          const optionsLine = opts && opts.length > 0 ? `\nOptions: ${opts.join(' / ')}` : '';
          return `${convo.response_text}\n\n${prompt}${optionsLine}\n\nReply with your answer (or type "skip").`;
        }

        if (convo.response_type === 'recommendations') {
          return await this.respondWithRecommendations(conversation, state, convo.brief_id, convo.recommendations);
        }
      }

      const result = await decisionEngineService.createBriefAndRecommend(userId, {
        raw_text: rawText,
        source: 'whatsapp',
        city: entities.city as string | undefined,
        event_date: entities.date as string | undefined,
        budget_max_paise: entities.budget ? Number(entities.budget) * 100 : undefined,
      });

      return await this.respondWithRecommendations(conversation, state, result.brief_id, result.recommendations);
    } catch {
      return 'I had trouble processing your brief. Could you describe your event again? Include details like city, budget, and type of entertainment.';
    }
  }

  private buildRawTextFallback(entities: Record<string, unknown>): string {
    const parts: string[] = [];
    if (entities.city) parts.push(`in ${entities.city}`);
    if (entities.date) parts.push(`on ${entities.date}`);
    if (entities.budget) parts.push(`budget ${entities.budget}`);
    if (entities.genre) parts.push(String(entities.genre));
    return parts.length > 0 ? parts.join(', ') : 'event entertainment options';
  }

  private async respondWithRecommendations(
    conversation: Record<string, unknown>,
    state: Record<string, unknown>,
    briefId: string,
    recommendations: Array<Record<string, unknown>>,
  ): Promise<string> {
    if (!recommendations || recommendations.length === 0) {
      return 'I couldn\'t find matching artists for your event right now. Try telling me more details like city, budget, or genre.';
    }

    const top = recommendations.slice(0, 3).map((r, idx) => ({
      rank: idx + 1,
      artist_id: String((r as any).artist_id ?? ''),
      artist_name: String((r as any).artist_name ?? 'Unknown'),
      artist_type: String((r as any).artist_type ?? 'Artist'),
      price_min_paise: Number((r as any).price_min_paise ?? 0),
      price_max_paise: Number((r as any).price_max_paise ?? 0),
      why_fit: Array.isArray((r as any).why_fit) ? (r as any).why_fit : [],
    }));

    await whatsAppRepository.updateConversation(conversation.id as string, {
      conversation_state: JSON.stringify({
        ...state,
        __decision_last_brief_id: briefId,
        __decision_last_recs: top.map((t) => ({ rank: t.rank, artist_id: t.artist_id })),
        __decision_last_action: 'recommendations',
      }),
    });

    let response = `Here are my top picks for your event:\n\n`;
    top.forEach((rec) => {
      const priceMin = `₹${Math.round(rec.price_min_paise / 100).toLocaleString('en-IN')}`;
      const priceMax = `₹${Math.round(rec.price_max_paise / 100).toLocaleString('en-IN')}`;
      response += `*${rec.rank}. ${rec.artist_name}* — ${rec.artist_type}\n`;
      response += `   ${priceMin} – ${priceMax}\n`;
      if (rec.why_fit?.length > 0) response += `   ✓ ${rec.why_fit[0]}\n`;
      response += '\n';
    });

    response += `Reply:\n`;
    response += `• "lock 1" (or 2/3) to request a lock\n`;
    response += `• "proposal" to get a PDF proposal link\n`;
    response += `• "refine" + details to adjust the brief`;

    return response;
  }

  private async handleDecisionProposal(conversation: Record<string, unknown>): Promise<string> {
    const userId = conversation.user_id as string | null;
    if (!userId) {
      return 'To generate a proposal, please log in to the platform first using this number. Then message "proposal" again.';
    }

    const state = typeof conversation.conversation_state === 'string'
      ? JSON.parse(conversation.conversation_state as string)
      : (conversation.conversation_state || {});

    const briefId = state.__decision_last_brief_id as string | undefined;
    const recs = (state.__decision_last_recs as Array<{ rank: number; artist_id: string }> | undefined) ?? [];
    const artistIds = recs.slice(0, 3).map((r) => r.artist_id).filter(Boolean);

    if (!briefId || artistIds.length === 0) {
      return 'I don’t have a recent brief to generate a proposal for. Send your event brief first.';
    }

    try {
      const proposal = await decisionEngineService.generateProposal(briefId, userId, { artist_ids: artistIds });
      const slug = (proposal as any).presentation_slug as string | undefined;
      if (!slug) {
        return 'Proposal generated, but I couldn’t create a shareable link. Please check your dashboard.';
      }

      const link = `${config.WEB_BASE_URL.replace(/\/$/, '')}/presentations/${slug}`;
      const pdf = `${config.API_BASE_URL.replace(/\/$/, '')}/v1/presentations/${slug}/pdf`;

      return `Your proposal is ready:\n\n• View: ${link}\n• PDF: ${pdf}\n\nReply "lock 1" if you want us to lock availability for a pick.`;
    } catch {
      return 'I couldn’t generate the proposal right now. Please try again in a minute.';
    }
  }

  private async handleDecisionLock(conversation: Record<string, unknown>, entities: Record<string, unknown>): Promise<string> {
    const userId = conversation.user_id as string | null;
    if (!userId) {
      return 'To request a lock, please log in to the platform first using this number. Then message "lock 1" again.';
    }

    const state = typeof conversation.conversation_state === 'string'
      ? JSON.parse(conversation.conversation_state as string)
      : (conversation.conversation_state || {});
    const briefId = state.__decision_last_brief_id as string | undefined;
    const recs = (state.__decision_last_recs as Array<{ rank: number; artist_id: string }> | undefined) ?? [];

    const idx = Number((entities.lock_index as number | undefined) ?? 0);
    const chosen = idx >= 1 ? recs[idx - 1] : null;

    if (!briefId || !chosen?.artist_id) {
      return 'I don’t have a recent shortlist to lock. Send your event brief first, then reply "lock 1".';
    }

    try {
      const lock = await decisionEngineService.lockAvailability(briefId, userId, { artist_id: chosen.artist_id });
      return `${lock.message}\nBooking ID: ${(lock.booking_id ?? '').slice(0, 8)}...`;
    } catch {
      return 'I couldn’t request a lock right now. Please try again in a minute.';
    }
  }

  private async handleDecisionRefine(conversation: Record<string, unknown>): Promise<string> {
    const state = typeof conversation.conversation_state === 'string'
      ? JSON.parse(conversation.conversation_state as string)
      : (conversation.conversation_state || {});

    await whatsAppRepository.updateConversation(conversation.id as string, {
      conversation_state: JSON.stringify({
        ...state,
        __decision_last_action: 'refine_prompt',
      }),
    });

    return 'Sure — reply with the updated event brief (city, budget, vibe, and date if possible). I’ll regenerate the shortlist.';
  }

  /**
   * Expire old conversations. Run as cron.
   */
  async expireConversations(): Promise<number> {
    return whatsAppRepository.expireOldConversations(WHATSAPP_SESSION_TIMEOUT_HOURS);
  }
}

export const whatsAppConversationService = new WhatsAppConversationService();
