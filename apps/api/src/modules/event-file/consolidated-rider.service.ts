/**
 * Event Company OS pivot (2026-04-22) — Consolidated rider service.
 *
 * Two upload paths:
 *   - generate(): merge per-vendor riders → PDF + Excel, stored as 'generated'
 *   - upload():   event company re-uploads hand-merged PDF → stored as
 *                 'uploaded' and becomes the file-of-record for that event.
 *
 * latest() returns whichever is most recent. No parse-back from uploads —
 * the PDF is treated as source of truth by humans downstream.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../../infrastructure/database.js';
import { config } from '../../config/index.js';
import { generateConsolidatedRider } from './consolidated-rider.generator.js';

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

export class ConsolidatedRiderService {
  async generate(eventFileId: string, userId: string) {
    const bundle = await generateConsolidatedRider(eventFileId);

    const stamp = Date.now();
    const baseKey = `event-files/${eventFileId}/consolidated-rider/${stamp}`;
    const pdfKey = `${baseKey}.pdf`;
    const xlsxKey = `${baseKey}.xlsx`;

    const [pdfUrl, xlsxUrl] = await Promise.all([
      upload(pdfKey, bundle.pdf, 'application/pdf'),
      upload(xlsxKey, bundle.xlsx, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    ]);

    const [row] = await db('consolidated_rider_artifacts')
      .insert({
        event_file_id: eventFileId,
        created_by_user_id: userId,
        source: 'generated',
        pdf_url: pdfUrl,
        xlsx_url: xlsxUrl,
        pdf_s3_key: pdfKey,
        xlsx_s3_key: xlsxKey,
        snapshot: JSON.stringify(bundle.snapshot),
      })
      .returning([
        'id',
        'event_file_id',
        'source',
        'pdf_url',
        'xlsx_url',
        'created_at',
      ]);

    return { ...row, snapshot: bundle.snapshot };
  }

  /**
   * Record an event company's hand-merged PDF upload as file-of-record.
   * Caller has already pushed the bytes to storage (via the normal
   * pre-signed upload path). We only record the URL/key + optional note.
   */
  async recordUpload(input: {
    event_file_id: string;
    created_by_user_id: string;
    pdf_url?: string | null;
    pdf_s3_key?: string | null;
    xlsx_url?: string | null;
    xlsx_s3_key?: string | null;
    note?: string | null;
  }) {
    if (!input.pdf_url && !input.xlsx_url) {
      throw new Error('UPLOAD_REQUIRES_AT_LEAST_ONE_FILE');
    }
    const [row] = await db('consolidated_rider_artifacts')
      .insert({
        event_file_id: input.event_file_id,
        created_by_user_id: input.created_by_user_id,
        source: 'uploaded',
        pdf_url: input.pdf_url ?? null,
        pdf_s3_key: input.pdf_s3_key ?? null,
        xlsx_url: input.xlsx_url ?? null,
        xlsx_s3_key: input.xlsx_s3_key ?? null,
        note: input.note ?? null,
      })
      .returning([
        'id',
        'event_file_id',
        'source',
        'pdf_url',
        'xlsx_url',
        'note',
        'created_at',
      ]);
    return row;
  }

  async latest(eventFileId: string) {
    return db('consolidated_rider_artifacts')
      .where({ event_file_id: eventFileId })
      .orderBy('created_at', 'desc')
      .first();
  }

  async list(eventFileId: string) {
    return db('consolidated_rider_artifacts')
      .where({ event_file_id: eventFileId })
      .orderBy('created_at', 'desc')
      .select(
        'id',
        'event_file_id',
        'source',
        'pdf_url',
        'xlsx_url',
        'note',
        'snapshot',
        'created_by_user_id',
        'created_at',
      );
  }
}

export const consolidatedRiderService = new ConsolidatedRiderService();
