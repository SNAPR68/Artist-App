/**
 * Event Company OS pivot (2026-04-22) — Call sheet orchestration.
 *
 * generate() → builds PDF + Excel, uploads to S3/Supabase Storage, records a
 * call_sheet_dispatches row, returns signed/CDN URLs.
 *
 * dispatch() → loads a generated row, fans out links to vendor roster via
 * WhatsApp + Email. Updates per-recipient status in dispatch_log.
 *
 * Outbound channels:
 *   - WhatsApp (primary) — preferred, text + link
 *   - Email              — always sent when vendor has email on file
 *
 * SMS path intentionally removed (2026-04-23) — MSG91 DLT dependency dropped;
 * WhatsApp via Interakt is the only transactional SMS-like channel we rely on.
 */
import crypto from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../../infrastructure/database.js';
import { config } from '../../config/index.js';
import { generateCallSheet } from './call-sheet.generator.js';
import { notificationService } from '../notification/notification.service.js';
import { NotificationChannel } from '@artist-booking/shared';

const s3 = new S3Client({
  region: config.STORAGE_REGION,
  ...(config.NODE_ENV === 'development'
    ? {
        endpoint: 'http://localhost:4566',
        forcePathStyle: true,
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      }
    : {
        endpoint: config.STORAGE_ENDPOINT,
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.STORAGE_ACCESS_KEY,
          secretAccessKey: config.STORAGE_SECRET_KEY,
        },
      }),
});

async function upload(key: string, body: Buffer, contentType: string): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: config.S3_BUCKET_DOCUMENTS,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  return `${config.CDN_BASE_URL}/${key}`;
}

async function signedView(key: string): Promise<string> {
  // Fall back to the CDN URL; when the bucket is made private, swap this for
  // a GetObjectCommand + getSignedUrl call.
  return `${config.CDN_BASE_URL}/${key}`;
}

export class CallSheetService {
  async generate(eventFileId: string, userId: string) {
    const bundle = await generateCallSheet(eventFileId);

    const stamp = Date.now();
    const baseKey = `event-files/${eventFileId}/call-sheets/${stamp}`;
    const pdfKey = `${baseKey}.pdf`;
    const xlsxKey = `${baseKey}.xlsx`;

    const [pdfUrl, xlsxUrl] = await Promise.all([
      upload(pdfKey, bundle.pdf, 'application/pdf'),
      upload(xlsxKey, bundle.xlsx, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    ]);

    const [row] = await db('call_sheet_dispatches')
      .insert({
        event_file_id: eventFileId,
        generated_by_user_id: userId,
        pdf_url: pdfUrl,
        xlsx_url: xlsxUrl,
        pdf_s3_key: pdfKey,
        xlsx_s3_key: xlsxKey,
        snapshot: JSON.stringify(bundle.snapshot),
        recipient_count: bundle.snapshot.vendor_count,
      })
      .returning(['id', 'event_file_id', 'pdf_url', 'xlsx_url', 'generated_at', 'recipient_count']);

    return { ...row, snapshot: bundle.snapshot };
  }

  async listForEventFile(eventFileId: string) {
    return db('call_sheet_dispatches')
      .where({ event_file_id: eventFileId })
      .orderBy('generated_at', 'desc')
      .select(
        'id',
        'event_file_id',
        'pdf_url',
        'xlsx_url',
        'snapshot',
        'recipient_count',
        'success_count',
        'failure_count',
        'generated_at',
        'dispatched_at',
      );
  }

  async dispatch(dispatchId: string) {
    const row = await db('call_sheet_dispatches').where({ id: dispatchId }).first();
    if (!row) throw new Error('DISPATCH_NOT_FOUND');

    const vendors = await db('event_file_vendors as efv')
      .leftJoin('artist_profiles as ap', 'efv.vendor_profile_id', 'ap.id')
      .leftJoin('users as u', 'u.id', 'ap.user_id')
      .where('efv.event_file_id', row.event_file_id)
      .select(
        'efv.vendor_profile_id',
        'ap.stage_name',
        'u.id as user_id',
        'u.phone as phone_e164',
        'u.email',
      );

    const log: Array<{
      vendor_profile_id: string;
      channel: string;
      status: 'sent' | 'failed';
      error?: string;
      sent_at: string;
    }> = [];
    let success = 0;
    let failure = 0;

    const snapshot = typeof row.snapshot === 'string' ? JSON.parse(row.snapshot) : row.snapshot;
    const subject = `Call Sheet — ${snapshot?.event_name ?? 'Your event'}`;
    const body = `${snapshot?.event_name}\n${snapshot?.event_date} · ${snapshot?.city}\nCall sheet (PDF): ${row.pdf_url}\nCall sheet (Excel): ${row.xlsx_url}`;

    const vars = {
      event_name: snapshot?.event_name ?? '',
      event_date: snapshot?.event_date ?? '',
      city: snapshot?.city ?? '',
      pdf_url: row.pdf_url ?? '',
      xlsx_url: row.xlsx_url ?? '',
      body,
      subject,
    };

    for (const v of vendors) {
      if (!v.phone_e164 && !v.email) {
        log.push({
          vendor_profile_id: v.vendor_profile_id,
          channel: 'none',
          status: 'failed',
          error: 'NO_CONTACT',
          sent_at: new Date().toISOString(),
        });
        failure++;
        continue;
      }

      // WhatsApp only — SMS fallback removed 2026-04-23 (MSG91 DLT dropped)
      if (v.phone_e164 && v.user_id) {
        try {
          await notificationService.send({
            userId: v.user_id,
            channel: NotificationChannel.WHATSAPP,
            template: 'call_sheet_ready',
            variables: vars,
            phone: v.phone_e164,
          });
          log.push({
            vendor_profile_id: v.vendor_profile_id,
            channel: 'whatsapp',
            status: 'sent',
            sent_at: new Date().toISOString(),
          });
          success++;
        } catch (err: any) {
          log.push({
            vendor_profile_id: v.vendor_profile_id,
            channel: 'whatsapp',
            status: 'failed',
            error: String(err?.message ?? err),
            sent_at: new Date().toISOString(),
          });
          failure++;
        }
      }

      // Email alongside
      if (v.email && v.user_id) {
        try {
          await notificationService.send({
            userId: v.user_id,
            channel: NotificationChannel.EMAIL,
            template: 'call_sheet_ready',
            variables: vars,
            email: v.email,
          });
          log.push({
            vendor_profile_id: v.vendor_profile_id,
            channel: 'email',
            status: 'sent',
            sent_at: new Date().toISOString(),
          });
          // email success doesn't double-count primary channel
        } catch (err: any) {
          log.push({
            vendor_profile_id: v.vendor_profile_id,
            channel: 'email',
            status: 'failed',
            error: String(err?.message ?? err),
            sent_at: new Date().toISOString(),
          });
        }
      }
    }

    const [updated] = await db('call_sheet_dispatches')
      .where({ id: dispatchId })
      .update({
        dispatch_log: JSON.stringify(log),
        success_count: success,
        failure_count: failure,
        dispatched_at: db.fn.now(),
      })
      .returning([
        'id',
        'event_file_id',
        'pdf_url',
        'xlsx_url',
        'recipient_count',
        'success_count',
        'failure_count',
        'dispatched_at',
      ]);

    return { ...updated, dispatch_log: log };
  }

  /**
   * Send vendor confirmation templates (YES/NO) for an event file.
   * Generates a per-vendor token, sends `vendor_confirm` template via WhatsApp,
   * stamps confirmation_sent_at. Idempotent per (event_file, vendor):
   * vendors already confirmed/declined are skipped.
   */
  async sendVendorConfirmations(eventFileId: string) {
    const file = await db('event_files').where({ id: eventFileId }).first();
    if (!file) throw new Error('EVENT_FILE_NOT_FOUND');

    const vendors = await db('event_file_vendors as efv')
      .leftJoin('artist_profiles as ap', 'efv.vendor_profile_id', 'ap.id')
      .leftJoin('users as u', 'u.id', 'ap.user_id')
      .where('efv.event_file_id', eventFileId)
      .whereIn('efv.confirmation_status', ['pending', 'no_response'])
      .select(
        'efv.id as roster_id',
        'efv.vendor_profile_id',
        'ap.stage_name',
        'u.id as user_id',
        'u.phone as phone_e164',
        'u.email',
      );

    const log: Array<{
      roster_id: string;
      vendor_profile_id: string;
      channel: 'whatsapp' | 'email' | 'none';
      status: 'sent' | 'failed' | 'skipped';
      error?: string;
    }> = [];
    let sent = 0;

    for (const v of vendors) {
      if (!v.phone_e164 && !v.email) {
        log.push({ roster_id: v.roster_id, vendor_profile_id: v.vendor_profile_id, channel: 'none', status: 'skipped', error: 'NO_CONTACT' });
        continue;
      }

      const token = crypto.randomBytes(24).toString('base64url');
      const confirmUrl = `${config.WEB_BASE_URL.replace(/\/$/, '')}/v/confirm/${token}`;
      const declineUrl = `${config.WEB_BASE_URL.replace(/\/$/, '')}/v/decline/${token}`;

      await db('event_file_vendors').where({ id: v.roster_id }).update({
        confirmation_token: token,
        confirmation_sent_at: db.fn.now(),
        confirmation_status: 'pending',
      });

      const vars = {
        event_name: file.event_name ?? '',
        event_date: file.event_date ? new Date(file.event_date).toISOString().slice(0, 10) : '',
        city: file.city ?? '',
        confirm_url: confirmUrl,
        decline_url: declineUrl,
      };

      if (v.phone_e164 && v.user_id) {
        try {
          await notificationService.send({
            userId: v.user_id,
            channel: NotificationChannel.WHATSAPP,
            template: 'vendor_confirm',
            variables: vars,
            phone: v.phone_e164,
          });
          log.push({ roster_id: v.roster_id, vendor_profile_id: v.vendor_profile_id, channel: 'whatsapp', status: 'sent' });
          sent++;
        } catch (err: any) {
          log.push({ roster_id: v.roster_id, vendor_profile_id: v.vendor_profile_id, channel: 'whatsapp', status: 'failed', error: String(err?.message ?? err) });
        }
      }

      if (v.email && v.user_id) {
        try {
          await notificationService.send({
            userId: v.user_id,
            channel: NotificationChannel.EMAIL,
            template: 'vendor_confirm',
            variables: vars,
            email: v.email,
          });
          log.push({ roster_id: v.roster_id, vendor_profile_id: v.vendor_profile_id, channel: 'email', status: 'sent' });
        } catch (err: any) {
          log.push({ roster_id: v.roster_id, vendor_profile_id: v.vendor_profile_id, channel: 'email', status: 'failed', error: String(err?.message ?? err) });
        }
      }
    }

    return { event_file_id: eventFileId, sent, attempted: vendors.length, log };
  }

  /**
   * Apply a vendor's YES/NO response. Called by:
   *   - WhatsApp inbound webhook (matches token OR vendor phone+recent send)
   *   - Public GET /v/confirm/:token or /v/decline/:token tap-throughs
   * Returns null if token invalid.
   */
  async recordVendorResponse(token: string, response: 'confirmed' | 'declined', responseText?: string) {
    const row = await db('event_file_vendors').where({ confirmation_token: token }).first();
    if (!row) return null;

    await db('event_file_vendors').where({ id: row.id }).update({
      confirmation_status: response,
      confirmation_responded_at: db.fn.now(),
      confirmation_response_text: responseText ?? response,
    });

    return { roster_id: row.id, event_file_id: row.event_file_id, vendor_profile_id: row.vendor_profile_id, confirmation_status: response };
  }

  /**
   * Match an inbound phone number to the most recent pending confirmation.
   * Used when vendor replies YES/NO to the template without us parsing the
   * button payload (e.g. they type YES instead of tapping).
   */
  async findPendingByPhone(phoneE164: string) {
    const clean = phoneE164.replace(/\D/g, '');
    return db('event_file_vendors as efv')
      .join('artist_profiles as ap', 'efv.vendor_profile_id', 'ap.id')
      .join('users as u', 'u.id', 'ap.user_id')
      .where('efv.confirmation_status', 'pending')
      .whereNotNull('efv.confirmation_sent_at')
      .whereNotNull('efv.confirmation_token')
      .whereRaw("regexp_replace(u.phone, '[^0-9]', '', 'g') = ?", [clean])
      .orderBy('efv.confirmation_sent_at', 'desc')
      .select('efv.id as roster_id', 'efv.event_file_id', 'efv.vendor_profile_id', 'efv.confirmation_token')
      .first();
  }

  /**
   * Send day-of check-in templates to confirmed vendors. Idempotent: vendors
   * already on_track / delayed / help are skipped; pending + no_response get
   * (re)nudged. Only confirmed vendors are contacted — declined vendors are
   * not our problem on event day.
   */
  async sendDayOfCheckins(eventFileId: string) {
    const file = await db('event_files').where({ id: eventFileId }).first();
    if (!file) throw new Error('EVENT_FILE_NOT_FOUND');

    const vendors = await db('event_file_vendors as efv')
      .leftJoin('artist_profiles as ap', 'efv.vendor_profile_id', 'ap.id')
      .leftJoin('users as u', 'u.id', 'ap.user_id')
      .where('efv.event_file_id', eventFileId)
      .where('efv.confirmation_status', 'confirmed')
      .whereIn('efv.checkin_status', ['pending', 'no_response'])
      .select(
        'efv.id as roster_id',
        'efv.vendor_profile_id',
        'ap.stage_name',
        'u.id as user_id',
        'u.phone as phone_e164',
      );

    const log: Array<{
      roster_id: string;
      vendor_profile_id: string;
      channel: 'whatsapp' | 'none';
      status: 'sent' | 'failed' | 'skipped';
      error?: string;
    }> = [];
    let sent = 0;

    for (const v of vendors) {
      if (!v.phone_e164 || !v.user_id) {
        log.push({ roster_id: v.roster_id, vendor_profile_id: v.vendor_profile_id, channel: 'none', status: 'skipped', error: 'NO_PHONE' });
        continue;
      }

      const vars = {
        event_name: file.event_name ?? '',
        event_date: file.event_date ? new Date(file.event_date).toISOString().slice(0, 10) : '',
        city: file.city ?? '',
      };

      try {
        await notificationService.send({
          userId: v.user_id,
          channel: NotificationChannel.WHATSAPP,
          template: 'day_of_checkin',
          variables: vars,
          phone: v.phone_e164,
        });
        await db('event_file_vendors').where({ id: v.roster_id }).update({
          checkin_sent_at: db.fn.now(),
          checkin_status: 'pending',
        });
        log.push({ roster_id: v.roster_id, vendor_profile_id: v.vendor_profile_id, channel: 'whatsapp', status: 'sent' });
        sent++;
      } catch (err: any) {
        log.push({ roster_id: v.roster_id, vendor_profile_id: v.vendor_profile_id, channel: 'whatsapp', status: 'failed', error: String(err?.message ?? err) });
      }
    }

    return { event_file_id: eventFileId, sent, attempted: vendors.length, log };
  }

  /**
   * Apply a vendor's day-of reply. Status mapping:
   *   yes     → on_track
   *   delayed → delayed
   *   help    → help
   */
  async recordVendorCheckin(
    rosterId: string,
    status: 'on_track' | 'delayed' | 'help',
    responseText?: string,
  ) {
    const [row] = await db('event_file_vendors')
      .where({ id: rosterId })
      .update({
        checkin_status: status,
        checkin_responded_at: db.fn.now(),
        checkin_response_text: responseText ?? status,
      })
      .returning(['id', 'event_file_id', 'vendor_profile_id', 'checkin_status']);
    return row ?? null;
  }

  /**
   * Match an inbound phone number to the most recent pending day-of check-in.
   * Only looks at confirmed vendors whose check-in was sent but not answered.
   */
  async findPendingCheckinByPhone(phoneE164: string) {
    const clean = phoneE164.replace(/\D/g, '');
    return db('event_file_vendors as efv')
      .join('artist_profiles as ap', 'efv.vendor_profile_id', 'ap.id')
      .join('users as u', 'u.id', 'ap.user_id')
      .where('efv.confirmation_status', 'confirmed')
      .whereIn('efv.checkin_status', ['pending', 'no_response'])
      .whereNotNull('efv.checkin_sent_at')
      .whereRaw("regexp_replace(u.phone, '[^0-9]', '', 'g') = ?", [clean])
      .orderBy('efv.checkin_sent_at', 'desc')
      .select('efv.id as roster_id', 'efv.event_file_id', 'efv.vendor_profile_id')
      .first();
  }
}

export const callSheetService = new CallSheetService();

// Suppress "unused" from the signedView helper — kept for the private-bucket path.
void signedView;
