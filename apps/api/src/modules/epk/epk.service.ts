/**
 * Event Company OS pivot (2026-04-22) — EPK service.
 *
 * Generates the 4-file EPK bundle (PDF + XLSX + PPTX + MP4 reel), uploads to
 * S3 under `epk/${vendor_profile_id}/${ts}.*`, and records in `epk_artifacts`.
 * Also supports 'uploaded' source so a vendor can re-upload their own deck as
 * the file-of-record.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../../infrastructure/database.js';
import { config } from '../../config/index.js';
import { loadEpkInputs, renderEpkBundle } from './epk.generator.js';

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

export class EpkService {
  async generate(vendorProfileId: string, userId: string, opts: { includeReel?: boolean } = {}) {
    const inputs = await loadEpkInputs(vendorProfileId);
    const bundle = await renderEpkBundle(inputs, opts);

    const ts = Date.now();
    const baseKey = `epk/${vendorProfileId}/${ts}`;
    const pdfKey = `${baseKey}.pdf`;
    const xlsxKey = `${baseKey}.xlsx`;
    const pptxKey = `${baseKey}.pptx`;
    const mp4Key = bundle.mp4 ? `${baseKey}.mp4` : null;

    const uploads: Promise<[string, string]>[] = [
      upload(pdfKey, bundle.pdf, 'application/pdf').then((u) => ['pdf', u]),
      upload(xlsxKey, bundle.xlsx, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').then((u) => ['xlsx', u]),
      upload(pptxKey, bundle.pptx, 'application/vnd.openxmlformats-officedocument.presentationml.presentation').then((u) => ['pptx', u]),
    ];
    if (bundle.mp4 && mp4Key) {
      uploads.push(upload(mp4Key, bundle.mp4, 'video/mp4').then((u) => ['mp4', u]));
    }
    const resolved = await Promise.all(uploads);
    const urls: Record<string, string> = Object.fromEntries(resolved);

    const [row] = await db('epk_artifacts')
      .insert({
        vendor_profile_id: vendorProfileId,
        created_by_user_id: userId,
        source: 'generated',
        pdf_url: urls.pdf ?? null,
        xlsx_url: urls.xlsx ?? null,
        pptx_url: urls.pptx ?? null,
        mp4_url: urls.mp4 ?? null,
        pdf_s3_key: pdfKey,
        xlsx_s3_key: xlsxKey,
        pptx_s3_key: pptxKey,
        mp4_s3_key: mp4Key,
        media_item_count: bundle.media_item_count,
        follower_count_snapshot: inputs.instagram.follower_count,
        ig_username_snapshot: inputs.instagram.ig_username,
      })
      .returning([
        'id',
        'vendor_profile_id',
        'source',
        'pdf_url',
        'xlsx_url',
        'pptx_url',
        'mp4_url',
        'media_item_count',
        'follower_count_snapshot',
        'ig_username_snapshot',
        'created_at',
      ]);

    return row;
  }

  async recordUpload(input: {
    vendor_profile_id: string;
    created_by_user_id: string;
    pdf_url?: string | null;
    pdf_s3_key?: string | null;
    xlsx_url?: string | null;
    xlsx_s3_key?: string | null;
    pptx_url?: string | null;
    pptx_s3_key?: string | null;
    mp4_url?: string | null;
    mp4_s3_key?: string | null;
    note?: string | null;
  }) {
    if (!input.pdf_url && !input.xlsx_url && !input.pptx_url && !input.mp4_url) {
      throw new Error('UPLOAD_REQUIRES_AT_LEAST_ONE_FILE');
    }
    const [row] = await db('epk_artifacts')
      .insert({
        vendor_profile_id: input.vendor_profile_id,
        created_by_user_id: input.created_by_user_id,
        source: 'uploaded',
        pdf_url: input.pdf_url ?? null,
        pdf_s3_key: input.pdf_s3_key ?? null,
        xlsx_url: input.xlsx_url ?? null,
        xlsx_s3_key: input.xlsx_s3_key ?? null,
        pptx_url: input.pptx_url ?? null,
        pptx_s3_key: input.pptx_s3_key ?? null,
        mp4_url: input.mp4_url ?? null,
        mp4_s3_key: input.mp4_s3_key ?? null,
        note: input.note ?? null,
      })
      .returning('*');
    return row;
  }

  async latest(vendorProfileId: string) {
    return db('epk_artifacts')
      .where({ vendor_profile_id: vendorProfileId })
      .orderBy('created_at', 'desc')
      .first();
  }

  async list(vendorProfileId: string) {
    return db('epk_artifacts')
      .where({ vendor_profile_id: vendorProfileId })
      .orderBy('created_at', 'desc')
      .select(
        'id',
        'vendor_profile_id',
        'source',
        'pdf_url',
        'xlsx_url',
        'pptx_url',
        'mp4_url',
        'media_item_count',
        'follower_count_snapshot',
        'ig_username_snapshot',
        'note',
        'created_by_user_id',
        'created_at',
      );
  }
}

export const epkService = new EpkService();
