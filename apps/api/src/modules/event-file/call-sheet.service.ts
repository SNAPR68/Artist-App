/**
 * Event Company OS pivot (2026-04-22) — Call sheet orchestration.
 *
 * generate() → builds PDF + Excel, uploads to S3/Supabase Storage, records a
 * call_sheet_dispatches row, returns signed/CDN URLs.
 *
 * dispatch() → loads a generated row, fans out links to vendor roster via
 * WhatsApp (fallback SMS) + Email. Updates per-recipient status in dispatch_log.
 *
 * Outbound channels:
 *   - WhatsApp (primary) — preferred, text + link
 *   - SMS (fallback)     — if WhatsApp send throws
 *   - Email              — always sent when vendor has email on file
 */
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

      // WhatsApp → fallback SMS
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
          try {
            await notificationService.send({
              userId: v.user_id,
              channel: NotificationChannel.SMS,
              template: 'call_sheet_ready',
              variables: vars,
              phone: v.phone_e164,
            });
            log.push({
              vendor_profile_id: v.vendor_profile_id,
              channel: 'sms',
              status: 'sent',
              sent_at: new Date().toISOString(),
            });
            success++;
          } catch (err2: any) {
            log.push({
              vendor_profile_id: v.vendor_profile_id,
              channel: 'sms',
              status: 'failed',
              error: String(err2?.message ?? err?.message ?? err2),
              sent_at: new Date().toISOString(),
            });
            failure++;
          }
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
}

export const callSheetService = new CallSheetService();

// Suppress "unused" from the signedView helper — kept for the private-bucket path.
void signedView;
