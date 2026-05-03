/**
 * Event Company WhatsApp conversation handler.
 *
 * Activated when the inbound phone number belongs to an event_company user.
 * Supports text and transcribed voice notes.
 *
 * Intents:
 *   ec_list_events        — "my events", "show events", "kya events hain"
 *   ec_call_sheet         — "call sheet for [event]", "send call sheet"
 *   ec_roster_status      — "who confirmed", "roster status", "kaun confirmed hai"
 *   ec_send_confirmations — "send confirmations", "vendor confirm bhejo"
 *   ec_send_checkins      — "send check-ins", "day of check-in"
 *   ec_boq                — "boq", "bill of quantities", "budget breakdown"
 *   ec_rider              — "rider pdf", "tech rider", "send rider"
 *
 * Disambiguation: if the intent needs an event and none is specified, reply
 * with a numbered list of upcoming events. User replies "1", "2", etc.
 */

import { db } from '../../infrastructure/database.js';
import { whatsAppProviderService } from './whatsapp-provider.service.js';
import { whatsAppRepository } from './whatsapp.repository.js';
import { callSheetService } from '../event-file/call-sheet.service.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

// ─── Intent parsing ───────────────────────────────────────────────────────────

const EC_INTENT_PATTERNS: Array<{ intent: string; patterns: RegExp[] }> = [
  {
    intent: 'ec_call_sheet',
    patterns: [
      /call\s*sheet/i,
      /callsheet/i,
      /send.*sheet/i,
      /sheet.*bhejo/i,
      /pdf.*bhejo/i,
      /call\s*time/i,
    ],
  },
  {
    intent: 'ec_roster_status',
    patterns: [
      /roster/i,
      /who.*confirm/i,
      /confirmed.*vendor/i,
      /kaun.*confirm/i,
      /vendor.*status/i,
      /who.*coming/i,
      /kaun.*aa\s*raha/i,
    ],
  },
  {
    intent: 'ec_send_confirmations',
    patterns: [
      /send.*confirm/i,
      /confirmation.*bhejo/i,
      /vendor.*confirm.*bhejo/i,
      /ping.*vendor/i,
      /message.*vendor/i,
    ],
  },
  {
    intent: 'ec_send_checkins',
    patterns: [
      /check[- ]?in/i,
      /day.?of/i,
      /morning.*ping/i,
      /check.*bhejo/i,
      /on.?track/i,
    ],
  },
  {
    intent: 'ec_boq',
    patterns: [
      /\bboq\b/i,
      /bill.*quant/i,
      /budget.*breakdown/i,
      /cost.*breakdown/i,
      /line.*item/i,
    ],
  },
  {
    intent: 'ec_rider_status',
    patterns: [
      /rider.*(status|fulfil|fulfill|gap|missing)/i,
      /(status|fulfil|fulfill|gap|missing).*rider/i,
      /rider.*ready/i,
      /kya.*rider.*ready/i,
    ],
  },
  {
    intent: 'ec_rider',
    patterns: [
      /rider/i,
      /tech.*rider/i,
      /technical.*rider/i,
      /rider.*pdf/i,
    ],
  },
  {
    intent: 'ec_list_events',
    patterns: [
      /my\s+event/i,
      /list.*event/i,
      /show.*event/i,
      /upcoming.*event/i,
      /kya.*event/i,
      /events?\s+hain/i,
      /events?\s+hai/i,
      /meri.*event/i,
    ],
  },
];

function parseEcIntent(text: string): string | null {
  for (const { intent, patterns } of EC_INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(text))) return intent;
  }
  return null;
}

/** Extract event name or partial name from text. */
function extractEventName(text: string): string | null {
  // "call sheet for Sunburn" / "roster for Diwali Night" / "Sunburn ka BOQ"
  const forMatch = text.match(/(?:for|ka|ki|ke)\s+(.+?)(?:\s+(?:ka|ki|ke|bhejo|send|pdf|sheet|roster|boq|rider)|$)/i);
  if (forMatch?.[1]) return forMatch[1].trim();
  return null;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

interface EventFileRow {
  id: string;
  event_name: string;
  event_date: string;
  status: string;
}

async function getUpcomingEvents(userId: string): Promise<EventFileRow[]> {
  return db('event_files')
    .where({ client_id: userId, deleted_at: null })
    .where('event_date', '>=', db.raw('CURRENT_DATE'))
    .whereIn('status', ['planning', 'confirmed', 'in_progress'])
    .orderBy('event_date', 'asc')
    .limit(8)
    .select('id', 'event_name', 'event_date', 'status');
}

async function findEventByName(userId: string, partial: string): Promise<EventFileRow | null> {
  const rows = await db('event_files')
    .where({ client_id: userId, deleted_at: null })
    .where('event_date', '>=', db.raw('CURRENT_DATE'))
    .whereILike('event_name', `%${partial}%`)
    .orderBy('event_date', 'asc')
    .limit(1)
    .select('id', 'event_name', 'event_date', 'status');
  return rows[0] ?? null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Action execution ─────────────────────────────────────────────────────────

async function executeAction(intent: string, eventFile: EventFileRow, userId: string): Promise<string> {
  const name = eventFile.event_name.replace(/^DEMO:\s*/i, '');
  const date = formatDate(eventFile.event_date);
  const apiBase = config.API_BASE_URL.replace(/\/$/, '');

  switch (intent) {
    case 'ec_call_sheet': {
      try {
        const row = await callSheetService.generate(eventFile.id, userId);
        const pdfLink = row.pdf_url ?? `${apiBase}/v1/event-files/${eventFile.id}/call-sheet?format=pdf`;
        const xlsxLink = row.xlsx_url ?? `${apiBase}/v1/event-files/${eventFile.id}/call-sheet?format=xlsx`;
        return `📋 *Call Sheet — ${name}* (${date})\n\n`
          + `PDF: ${pdfLink}\n`
          + `Excel: ${xlsxLink}\n\n`
          + `Reply "send confirmations" to WhatsApp all vendors.`;
      } catch (err) {
        logger.error('[EC_WA] call sheet generate failed', { err });
        return `Couldn't generate the call sheet right now. Try again in a minute or open the dashboard.`;
      }
    }

    case 'ec_roster_status': {
      const vendors = await db('event_file_vendors as efv')
        .join('artist_profiles as ap', 'ap.id', 'efv.vendor_profile_id')
        .where('efv.event_file_id', eventFile.id)
        .whereNull('efv.deleted_at')
        .select('ap.stage_name', 'efv.role', 'efv.confirmation_status', 'efv.checkin_status');

      if (vendors.length === 0) {
        return `No vendors on *${name}* yet. Add them from the dashboard.`;
      }

      const confirmed = vendors.filter((v: Record<string, unknown>) => v.confirmation_status === 'confirmed');
      const pending = vendors.filter((v: Record<string, unknown>) => v.confirmation_status === 'pending' || !v.confirmation_status);
      const declined = vendors.filter((v: Record<string, unknown>) => v.confirmation_status === 'declined');

      let msg = `✅ *Roster — ${name}* (${date})\n\n`;
      msg += `${vendors.length} total · ${confirmed.length} confirmed · ${pending.length} pending`;
      if (declined.length) msg += ` · ${declined.length} declined`;
      msg += '\n\n';

      if (confirmed.length) {
        msg += `*Confirmed:*\n${confirmed.slice(0, 5).map((v: Record<string, unknown>) => `• ${v.stage_name} (${v.role})`).join('\n')}\n`;
        if (confirmed.length > 5) msg += `  …+${confirmed.length - 5} more\n`;
        msg += '\n';
      }
      if (pending.length) {
        msg += `*Awaiting reply:*\n${pending.slice(0, 5).map((v: Record<string, unknown>) => `• ${v.stage_name}`).join('\n')}\n`;
        if (pending.length > 5) msg += `  …+${pending.length - 5} more\n`;
      }

      return msg.trim();
    }

    case 'ec_send_confirmations': {
      try {
        const result = await callSheetService.sendVendorConfirmations(eventFile.id);
        return `📨 Vendor confirmation messages sent for *${name}*.\n\n`
          + `${result.sent}/${result.attempted} sent via WhatsApp.\n`
          + `Vendors will reply YES or NO directly to this number.`;
      } catch {
        return `Couldn't send confirmations right now. Try from the dashboard.`;
      }
    }

    case 'ec_send_checkins': {
      try {
        const result = await callSheetService.sendDayOfCheckins(eventFile.id);
        return `🟢 Day-of check-in messages sent for *${name}*.\n\n`
          + `${result.sent}/${result.attempted} sent to confirmed vendors.\n`
          + `They'll reply ON TRACK / DELAYED / HELP.`;
      } catch {
        return `Couldn't send check-ins right now. Try from the dashboard.`;
      }
    }

    case 'ec_boq': {
      // Seed if empty, then generate
      const existing = await db('boq_line_items')
        .where({ event_file_id: eventFile.id })
        .whereNull('deleted_at')
        .count('id as n')
        .first();

      if (Number(existing?.n ?? 0) === 0) {
        await db('boq_line_items')
          .where({ event_file_id: eventFile.id })
          .delete(); // clean slate

        // Seed from roster
        const rosterVendors = await db('event_file_vendors as efv')
          .join('artist_profiles as ap', 'ap.id', 'efv.vendor_profile_id')
          .where('efv.event_file_id', eventFile.id)
          .whereNull('efv.deleted_at')
          .select('efv.id', 'ap.id as apid', 'ap.stage_name', 'ap.category', 'efv.booking_amount', 'efv.role');

        if (rosterVendors.length > 0) {
          await db('boq_line_items').insert(
            rosterVendors.map((v: Record<string, unknown>, i: number) => ({
              event_file_id: eventFile.id,
              vendor_profile_id: v.apid,
              category: v.category ?? 'other',
              description: `${v.stage_name} — ${v.role}`,
              quantity: 1,
              unit_price_inr: Number(v.booking_amount ?? 0),
              gst_rate_pct: 18,
              sort_order: i,
            }))
          ).onConflict(['event_file_id', 'vendor_profile_id']).ignore();
        }
      }

      // Generate the doc
      const docRes = await fetch(`${apiBase}/v1/event-files/${eventFile.id}/boq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal': 'whatsapp-bot' },
      });
      const doc = docRes.ok ? (await docRes.json() as { data?: { pdf_url?: string; xlsx_url?: string } }).data : null;

      if (doc?.pdf_url) {
        return `📊 *BOQ — ${name}* (${date})\n\n`
          + `PDF: ${doc.pdf_url}\n`
          + (doc.xlsx_url ? `Excel: ${doc.xlsx_url}\n` : '');
      }
      return `BOQ generated for *${name}*. Open your dashboard to download.`;
    }

    case 'ec_rider': {
      const riderRes = await fetch(`${apiBase}/v1/event-files/${eventFile.id}/consolidated-rider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal': 'whatsapp-bot' },
      });
      const rider = riderRes.ok ? (await riderRes.json() as { data?: { pdf_url?: string } }).data : null;

      if (rider?.pdf_url) {
        return `🎛️ *Tech Rider — ${name}* (${date})\n\nPDF: ${rider.pdf_url}`;
      }
      return `Rider generated for *${name}*. Open your dashboard to download.`;
    }

    case 'ec_rider_status': {
      try {
        const { riderService } = await import('../rider/rider.service.js');
        const result = await riderService.listEventFulfillment(eventFile.id);
        const s = result.summary;

        if (s.total_items === 0) {
          return `🎛️ *Rider — ${name}* (${date})\n\nNo rider items yet. Add artists with riders to the roster first.`;
        }

        let msg = `🎛️ *Rider Status — ${name}* (${date})\n\n`;
        msg += `${s.fulfilled_items}/${s.total_items} fulfilled · ${s.fulfillment_pct}%\n`;
        if (s.missing_must_haves) msg += `⚠️ ${s.missing_must_haves} must-have item(s) unfulfilled\n`;
        if (s.mismatch_count) msg += `❌ ${s.mismatch_count} vendor mismatch(es)\n`;
        msg += '\n';

        const mismatches = result.items.filter((r) => r.cross_check_status === 'mismatched').slice(0, 5);
        if (mismatches.length) {
          msg += `*Mismatches:*\n`;
          for (const m of mismatches) {
            msg += `• ${m.item_name} → ${m.vendor_name ?? '(unassigned)'} — ${m.cross_check_notes ?? ''}\n`;
          }
          msg += '\n';
        }

        const unassigned = result.items.filter((r) => !r.assigned_vendor_id && r.priority === 'must_have').slice(0, 5);
        if (unassigned.length) {
          msg += `*Must-have, unassigned:*\n`;
          for (const u of unassigned) {
            msg += `• ${u.item_name} (${u.quantity}) — ${u.artist_name}\n`;
          }
          msg += '\n';
        }

        if (s.is_rider_satisfied) {
          msg += `✅ Rider is fully fulfilled.`;
        } else {
          msg += `Open the dashboard to assign vendors / mark items.`;
        }
        return msg.trim();
      } catch (err) {
        logger.error('[EC_WA] rider status failed', { err });
        return `Couldn't fetch rider status right now. Try the dashboard.`;
      }
    }

    default:
      return `I didn't understand that action. Try: "call sheet", "roster status", "send confirmations", "BOQ", "rider".`;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export class EcConversationService {
  /**
   * Handle an inbound message from an event_company user.
   * Returns the response string (already sent to WhatsApp).
   */
  async handle(
    phone: string,
    text: string,
    userId: string,
    conversationId: string,
  ): Promise<string> {
    const state = await this.getState(conversationId);

    // ── Disambiguation reply: user replied with a number after event list ──
    if (state.__ec_awaiting_event_pick && /^\s*\d+\s*$/.test(text.trim())) {
      const idx = parseInt(text.trim(), 10) - 1;
      const events = state.__ec_event_list as EventFileRow[] | undefined;
      const pendingIntent = state.__ec_pending_intent as string | undefined;

      if (events && pendingIntent && idx >= 0 && idx < events.length) {
        const chosen = events[idx];
        await this.clearPickState(conversationId);
        const response = await executeAction(pendingIntent, chosen, userId);
        await this.sendAndLog(phone, response, conversationId, pendingIntent);
        return response;
      }
    }

    // ── Parse intent ──────────────────────────────────────────────────────
    const intent = parseEcIntent(text);

    if (intent === 'ec_list_events') {
      return this.replyWithEventList(phone, userId, conversationId, null);
    }

    if (!intent) {
      const fallback = `Hi! I'm GRID. I can help you manage your events via WhatsApp.\n\n`
        + `Try:\n`
        + `• "Call sheet for [event name]"\n`
        + `• "Roster status for [event name]"\n`
        + `• "Send confirmations"\n`
        + `• "Send check-ins"\n`
        + `• "BOQ for [event name]"\n`
        + `• "Tech rider for [event name]"\n`
        + `• "Rider status for [event name]"\n`
        + `• "My events"\n\n`
        + `Or send a voice note — I'll understand that too.`;
      await this.sendAndLog(phone, fallback, conversationId, 'ec_unknown');
      return fallback;
    }

    // ── Try to find event from message ────────────────────────────────────
    const eventNameHint = extractEventName(text);
    let eventFile: EventFileRow | null = null;

    if (eventNameHint) {
      eventFile = await findEventByName(userId, eventNameHint);
    }

    if (!eventFile) {
      // Check if there's only one upcoming event — use it automatically
      const events = await getUpcomingEvents(userId);
      if (events.length === 1) {
        eventFile = events[0];
      } else if (events.length === 0) {
        const response = `You don't have any upcoming events on GRID. Create one from the dashboard first.`;
        await this.sendAndLog(phone, response, conversationId, intent);
        return response;
      } else {
        // Need disambiguation
        return this.replyWithEventList(phone, userId, conversationId, intent);
      }
    }

    const response = await executeAction(intent, eventFile, userId);
    await this.sendAndLog(phone, response, conversationId, intent);
    return response;
  }

  private async replyWithEventList(
    phone: string,
    userId: string,
    conversationId: string,
    pendingIntent: string | null,
  ): Promise<string> {
    const events = await getUpcomingEvents(userId);

    if (events.length === 0) {
      const msg = `You don't have any upcoming events on GRID.`;
      await this.sendAndLog(phone, msg, conversationId, 'ec_list_events');
      return msg;
    }

    let msg = `📅 *Your upcoming events:*\n\n`;
    events.forEach((e, i) => {
      msg += `${i + 1}. ${e.event_name.replace(/^DEMO:\s*/i, '')} — ${formatDate(e.event_date)}\n`;
    });

    if (pendingIntent) {
      msg += `\nReply with the number to select an event.`;
      // Store state for disambiguation
      await whatsAppRepository.updateConversation(conversationId, {
        conversation_state: JSON.stringify({
          __ec_awaiting_event_pick: true,
          __ec_pending_intent: pendingIntent,
          __ec_event_list: events,
        }),
      });
    }

    await this.sendAndLog(phone, msg, conversationId, 'ec_list_events');
    return msg;
  }

  private async sendAndLog(phone: string, text: string, conversationId: string, intent: string) {
    const msgId = await whatsAppProviderService.sendText(phone, text);
    await whatsAppRepository.addMessage({
      conversation_id: conversationId,
      direction: 'outbound',
      message_type: 'text',
      content: text,
      parsed_intent: intent,
      provider_message_id: msgId,
    });
  }

  private async getState(conversationId: string): Promise<Record<string, unknown>> {
    const conv = await whatsAppRepository.getConversation(conversationId);
    if (!conv?.conversation_state) return {};
    try {
      return typeof conv.conversation_state === 'string'
        ? JSON.parse(conv.conversation_state)
        : (conv.conversation_state as Record<string, unknown>);
    } catch {
      return {};
    }
  }

  private async clearPickState(conversationId: string) {
    await whatsAppRepository.updateConversation(conversationId, {
      conversation_state: JSON.stringify({
        __ec_awaiting_event_pick: false,
        __ec_pending_intent: null,
        __ec_event_list: null,
      }),
    });
  }
}

export const ecConversationService = new EcConversationService();
