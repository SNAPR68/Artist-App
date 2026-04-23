/**
 * Event Company OS pivot (2026-04-22) — BOQ service.
 *
 * Manages the BOQ line items + artifact generation for an event file.
 *   - seedFromRoster(): creates starter line items from event_file_vendors
 *   - listItems()/addItem()/updateItem()/removeItem(): CRUD on line items
 *   - generate(): renders PDF + Excel, uploads, records an 'artifact' row
 *   - recordUpload(): event company re-uploads hand-built BOQ as file-of-record
 *   - latest()/list(): fetch artifacts
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../../infrastructure/database.js';
import { config } from '../../config/index.js';
import { generateBOQ } from './boq.generator.js';

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

export interface BOQItemInput {
  vendor_profile_id?: string | null;
  category: string;
  description: string;
  quantity: number;
  unit_price_inr: number;
  gst_rate_pct?: number | null;
  sort_order?: number;
}

export class BOQService {
  /**
   * Create initial line items from the event file's vendor roster. One row
   * per vendor, populated with their fee if stored on event_file_vendors
   * (agreed_fee_inr column), otherwise zero. Safe to call multiple times —
   * existing rows are left alone; only vendors not already represented get
   * added.
   */
  async seedFromRoster(eventFileId: string) {
    const ef = await db('event_files').where({ id: eventFileId, deleted_at: null }).first();
    if (!ef) throw new Error('EVENT_FILE_NOT_FOUND');

    // agreed_amount lives on bookings (paise). Pull via efv.booking_id when
    // the vendor has been booked; fall back to 0 for shortlisted-only rows.
    const roster = await db('event_file_vendors as efv')
      .leftJoin('artist_profiles as ap', 'ap.id', 'efv.vendor_profile_id')
      .leftJoin('bookings as b', 'b.id', 'efv.booking_id')
      .where('efv.event_file_id', eventFileId)
      .select(
        'efv.vendor_profile_id',
        'b.agreed_amount as agreed_amount_paise',
        'ap.stage_name',
        'ap.category',
      );

    const existing = await db('boq_line_items')
      .where({ event_file_id: eventFileId })
      .whereNotNull('vendor_profile_id')
      .pluck('vendor_profile_id');
    const existingSet = new Set(existing);

    const toInsert = roster
      .filter((r) => !existingSet.has(r.vendor_profile_id))
      .map((r, i) => {
        // agreed_amount is paise on bookings; convert to INR.
        const unit = r.agreed_amount_paise ? Number(r.agreed_amount_paise) / 100 : 0;
        return {
          event_file_id: eventFileId,
          vendor_profile_id: r.vendor_profile_id,
          category: r.category ?? 'artist',
          description: `${r.stage_name ?? 'Vendor'} — performance fee`,
          quantity: 1,
          unit_price_inr: unit,
          line_total_inr: unit,
          gst_rate_pct: 18,
          sort_order: i,
        };
      });

    if (toInsert.length === 0) return { inserted: 0 };
    await db('boq_line_items')
      .insert(toInsert)
      .onConflict(['event_file_id', 'vendor_profile_id'])
      .ignore();
    return { inserted: toInsert.length };
  }

  async listItems(eventFileId: string) {
    return db('boq_line_items as bli')
      .leftJoin('artist_profiles as ap', 'ap.id', 'bli.vendor_profile_id')
      .where('bli.event_file_id', eventFileId)
      .orderBy('bli.sort_order', 'asc')
      .select(
        'bli.id',
        'bli.vendor_profile_id',
        'bli.category',
        'bli.description',
        'bli.quantity',
        'bli.unit_price_inr',
        'bli.line_total_inr',
        'bli.gst_rate_pct',
        'bli.sort_order',
        'ap.stage_name as vendor_name',
      );
  }

  async addItem(eventFileId: string, input: BOQItemInput) {
    const lineTotal = input.quantity * input.unit_price_inr;
    const [row] = await db('boq_line_items')
      .insert({
        event_file_id: eventFileId,
        vendor_profile_id: input.vendor_profile_id ?? null,
        category: input.category,
        description: input.description,
        quantity: input.quantity,
        unit_price_inr: input.unit_price_inr,
        line_total_inr: lineTotal,
        gst_rate_pct: input.gst_rate_pct ?? null,
        sort_order: input.sort_order ?? 0,
      })
      .returning('*');
    return row;
  }

  async updateItem(eventFileId: string, itemId: string, patch: Partial<BOQItemInput>) {
    const current = await db('boq_line_items')
      .where({ id: itemId, event_file_id: eventFileId })
      .first();
    if (!current) return null;

    const qty = patch.quantity ?? Number(current.quantity);
    const unit = patch.unit_price_inr ?? Number(current.unit_price_inr);
    const lineTotal = qty * unit;

    const [row] = await db('boq_line_items')
      .where({ id: itemId, event_file_id: eventFileId })
      .update({
        ...(patch.vendor_profile_id !== undefined ? { vendor_profile_id: patch.vendor_profile_id } : {}),
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        quantity: qty,
        unit_price_inr: unit,
        line_total_inr: lineTotal,
        ...(patch.gst_rate_pct !== undefined ? { gst_rate_pct: patch.gst_rate_pct } : {}),
        ...(patch.sort_order !== undefined ? { sort_order: patch.sort_order } : {}),
        updated_at: db.fn.now(),
      })
      .returning('*');
    return row;
  }

  async removeItem(eventFileId: string, itemId: string) {
    const [row] = await db('boq_line_items')
      .where({ id: itemId, event_file_id: eventFileId })
      .del()
      .returning('id');
    return row ?? null;
  }

  async generate(eventFileId: string, userId: string) {
    const bundle = await generateBOQ(eventFileId);

    const stamp = Date.now();
    const baseKey = `event-files/${eventFileId}/boq/${stamp}`;
    const pdfKey = `${baseKey}.pdf`;
    const xlsxKey = `${baseKey}.xlsx`;

    const [pdfUrl, xlsxUrl] = await Promise.all([
      upload(pdfKey, bundle.pdf, 'application/pdf'),
      upload(xlsxKey, bundle.xlsx, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    ]);

    const [row] = await db('boq_artifacts')
      .insert({
        event_file_id: eventFileId,
        created_by_user_id: userId,
        source: 'generated',
        pdf_url: pdfUrl,
        xlsx_url: xlsxUrl,
        pdf_s3_key: pdfKey,
        xlsx_s3_key: xlsxKey,
        subtotal_inr: bundle.totals.subtotal_inr,
        gst_inr: bundle.totals.gst_inr,
        total_inr: bundle.totals.total_inr,
        line_item_count: bundle.totals.line_item_count,
      })
      .returning([
        'id',
        'event_file_id',
        'source',
        'pdf_url',
        'xlsx_url',
        'subtotal_inr',
        'gst_inr',
        'total_inr',
        'line_item_count',
        'created_at',
      ]);

    return row;
  }

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
      throw new Error('UPLOAD_REQUIRES_PDF_OR_XLSX');
    }
    const [row] = await db('boq_artifacts')
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
      .returning('*');
    return row;
  }

  async latest(eventFileId: string) {
    return db('boq_artifacts')
      .where({ event_file_id: eventFileId })
      .orderBy('created_at', 'desc')
      .first();
  }

  async list(eventFileId: string) {
    return db('boq_artifacts')
      .where({ event_file_id: eventFileId })
      .orderBy('created_at', 'desc')
      .select(
        'id',
        'event_file_id',
        'source',
        'pdf_url',
        'xlsx_url',
        'subtotal_inr',
        'gst_inr',
        'total_inr',
        'line_item_count',
        'note',
        'created_by_user_id',
        'created_at',
      );
  }
}

export const boqService = new BOQService();
