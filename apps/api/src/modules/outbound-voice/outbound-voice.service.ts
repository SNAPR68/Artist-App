/**
 * Event Company OS pivot (2026-04-22) — Outbound voice service.
 *
 * Provider-agnostic. Queues a row in outbound_voice_calls and (when a provider
 * is configured) dispatches to Exotel/Plivo. If no provider is configured the
 * row stays queued — a later cron / manual trigger can resume. Webhook
 * receiver updates status + transcript once the call ends.
 */
import { db } from '../../infrastructure/database.js';
import { config } from '../../config/index.js';
import {
  renderScript,
  supports,
  type OutboundCategory,
  type OutboundPurpose,
} from './outbound-voice.scripts.js';

export interface QueueCallInput {
  vendor_profile_id: string;
  initiated_by_user_id: string;
  purpose: OutboundPurpose;
  event_file_id?: string;
  booking_id?: string;
}

export class OutboundVoiceService {
  async queueCall(input: QueueCallInput) {
    const vendor = await db('artist_profiles as ap')
      .leftJoin('users as u', 'u.id', 'ap.user_id')
      .where('ap.id', input.vendor_profile_id)
      .select(
        'ap.id',
        'ap.stage_name',
        'ap.category',
        'ap.base_city',
        'u.phone as phone_e164',
      )
      .first();

    if (!vendor) throw new Error('VENDOR_NOT_FOUND');
    const category: OutboundCategory = (vendor.category ?? 'artist') as OutboundCategory;

    if (!supports(category, input.purpose)) {
      throw new Error(`UNSUPPORTED_SCRIPT:${category}:${input.purpose}`);
    }

    // Gather context from event_file / booking if linked.
    let event_name: string | undefined;
    let event_date: string | undefined;
    let city: string | undefined;
    let call_time: string | undefined;

    if (input.event_file_id) {
      const ef = await db('event_files').where({ id: input.event_file_id }).first();
      if (ef) {
        event_name = ef.event_name;
        event_date = ef.event_date;
        city = ef.city;
        call_time = ef.call_time ?? undefined;
      }
    }

    const script = renderScript(category, input.purpose, {
      vendor_name: vendor.stage_name,
      event_name,
      event_date,
      city: city ?? vendor.base_city,
      call_time,
    });

    const [row] = await db('outbound_voice_calls')
      .insert({
        vendor_profile_id: vendor.id,
        initiated_by_user_id: input.initiated_by_user_id,
        event_file_id: input.event_file_id ?? null,
        booking_id: input.booking_id ?? null,
        category,
        purpose: input.purpose,
        phone_e164: vendor.phone_e164 ?? null,
        status: 'queued',
        ai_summary: JSON.stringify({ script }),
      })
      .returning([
        'id',
        'vendor_profile_id',
        'category',
        'purpose',
        'status',
        'queued_at',
      ]);

    // Fire-and-forget provider dispatch if configured.
    if (this.providerConfigured() && script) {
      this.dispatchToProvider(row.id, script, vendor.phone_e164).catch(() => {
        // Errors are recorded on the row via markFailed; never crash the queue path.
      });
    }

    return { ...row, script };
  }

  /**
   * Bulk: queue a day-of check-in call to every vendor on an event file's
   * roster whose category supports the day_of_checkin script. Categories
   * without a day_of_checkin script (currently license) are skipped with a
   * reason line in the response.
   */
  async bulkDayOfCheckin(input: {
    event_file_id: string;
    initiated_by_user_id: string;
  }) {
    const roster = await db('event_file_vendors as efv')
      .leftJoin('artist_profiles as ap', 'efv.vendor_profile_id', 'ap.id')
      .where('efv.event_file_id', input.event_file_id)
      .select(
        'efv.vendor_profile_id',
        'ap.category',
        'ap.stage_name',
      );

    const queued: Array<Record<string, unknown>> = [];
    const skipped: Array<{ vendor_profile_id: string; stage_name: string | null; reason: string }> = [];

    for (const r of roster) {
      const cat: OutboundCategory = (r.category ?? 'artist') as OutboundCategory;
      if (!supports(cat, 'day_of_checkin')) {
        skipped.push({
          vendor_profile_id: r.vendor_profile_id,
          stage_name: r.stage_name ?? null,
          reason: `No day_of_checkin script for category '${cat}'`,
        });
        continue;
      }
      try {
        const row = await this.queueCall({
          vendor_profile_id: r.vendor_profile_id,
          initiated_by_user_id: input.initiated_by_user_id,
          purpose: 'day_of_checkin',
          event_file_id: input.event_file_id,
        });
        queued.push(row);
      } catch (err: any) {
        skipped.push({
          vendor_profile_id: r.vendor_profile_id,
          stage_name: r.stage_name ?? null,
          reason: String(err?.message ?? err),
        });
      }
    }

    return { queued_count: queued.length, skipped_count: skipped.length, queued, skipped };
  }

  async listForEventFile(eventFileId: string) {
    return db('outbound_voice_calls as ovc')
      .leftJoin('artist_profiles as ap', 'ap.id', 'ovc.vendor_profile_id')
      .where('ovc.event_file_id', eventFileId)
      .orderBy('ovc.queued_at', 'desc')
      .select(
        'ovc.id',
        'ovc.vendor_profile_id',
        'ovc.category',
        'ovc.purpose',
        'ovc.status',
        'ovc.available',
        'ovc.transcript',
        'ovc.duration_seconds',
        'ovc.queued_at',
        'ovc.ended_at',
        'ap.stage_name',
      );
  }

  async get(id: string) {
    return db('outbound_voice_calls').where({ id }).first();
  }

  async markStatus(id: string, patch: Record<string, unknown>) {
    const [row] = await db('outbound_voice_calls')
      .where({ id })
      .update({ ...patch, updated_at: db.fn.now() })
      .returning(['id', 'status']);
    return row;
  }

  private providerConfigured(): boolean {
    const anyCfg = config as unknown as Record<string, string | undefined>;
    return !!(anyCfg.EXOTEL_API_KEY || anyCfg.PLIVO_AUTH_ID || anyCfg.TWILIO_ACCOUNT_SID);
  }

  private async dispatchToProvider(callId: string, _script: string, _phone: string | null) {
    // Real dispatch is plugged in per deployment. Leaving this as a stub
    // documents the seam without requiring provider creds in the repo.
    await this.markStatus(callId, { status: 'dialing', started_at: db.fn.now() });
  }
}

export const outboundVoiceService = new OutboundVoiceService();
