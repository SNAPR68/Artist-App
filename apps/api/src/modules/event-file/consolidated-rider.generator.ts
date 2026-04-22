/**
 * Event Company OS pivot (2026-04-22) — Consolidated technical rider.
 *
 * Pulls the per-vendor artist_riders row + rider_line_items for every vendor
 * on the event file roster. Merges into:
 *   - PDF: one page per vendor with sections (Technical, Hospitality, Travel, Notes)
 *   - Excel: single sheet, one row per line item, vendor column first for pivoting
 *
 * Vendors with no rider row are listed on a summary page at the end. Upload
 * path (re-uploading a merged PDF = file-of-record) is handled in the service
 * layer — this generator only produces the machine-built artifact.
 */
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { db } from '../../infrastructure/database.js';

const COLORS = {
  ink: '#0e0e0f',
  purple: '#c39bff',
  cyan: '#a1faff',
  text: '#333333',
  muted: '#666666',
  border: '#dddddd',
};

export interface ConsolidatedRiderBundle {
  pdf: Buffer;
  xlsx: Buffer;
  snapshot: {
    event_name: string;
    vendor_count: number;
    vendors_with_rider: number;
    total_line_items: number;
    generated_at: string;
  };
}

interface VendorRider {
  vendor_profile_id: string;
  stage_name: string | null;
  category: string | null;
  rider_id: string | null;
  notes: string | null;
  hospitality_requirements: any;
  travel_requirements: any;
  line_items: Array<{
    category: string;
    item_name: string;
    quantity: number;
    priority: string;
    specifications: string | null;
  }>;
}

async function loadConsolidated(eventFileId: string) {
  const ef = await db('event_files').where({ id: eventFileId, deleted_at: null }).first();
  if (!ef) throw new Error('EVENT_FILE_NOT_FOUND');

  const roster = await db('event_file_vendors as efv')
    .leftJoin('artist_profiles as ap', 'efv.vendor_profile_id', 'ap.id')
    .leftJoin('artist_riders as ar', 'ar.artist_id', 'ap.id')
    .where('efv.event_file_id', eventFileId)
    .select(
      'efv.vendor_profile_id',
      'ap.stage_name',
      'ap.category',
      'ar.id as rider_id',
      'ar.notes',
      'ar.hospitality_requirements',
      'ar.travel_requirements',
    );

  // Bulk-fetch line items in one query.
  const riderIds = roster.map((r) => r.rider_id).filter(Boolean) as string[];
  const items = riderIds.length
    ? await db('rider_line_items')
        .whereIn('rider_id', riderIds)
        .orderBy([{ column: 'rider_id' }, { column: 'sort_order' }])
        .select('rider_id', 'category', 'item_name', 'quantity', 'priority', 'specifications')
    : [];

  const vendors: VendorRider[] = roster.map((r) => ({
    vendor_profile_id: r.vendor_profile_id,
    stage_name: r.stage_name,
    category: r.category,
    rider_id: r.rider_id,
    notes: r.notes,
    hospitality_requirements: r.hospitality_requirements ?? {},
    travel_requirements: r.travel_requirements ?? {},
    line_items: items
      .filter((li) => li.rider_id === r.rider_id)
      .map((li) => ({
        category: li.category,
        item_name: li.item_name,
        quantity: li.quantity,
        priority: li.priority,
        specifications: li.specifications,
      })),
  }));

  return { ef, vendors };
}

async function renderPDF(ef: any, vendors: VendorRider[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Cover
    doc.rect(0, 0, doc.page.width, 72).fill(COLORS.ink);
    doc.fillColor(COLORS.purple).font('Helvetica-Bold').fontSize(9)
      .text('GRID · CONSOLIDATED TECHNICAL RIDER', 50, 28, { characterSpacing: 2 });
    doc.fillColor(COLORS.cyan).font('Helvetica').fontSize(9)
      .text(new Date().toLocaleString('en-IN'), 50, 46);

    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(22)
      .text(ef.event_name, 50, 100);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(11)
      .text(`${ef.event_date} · ${ef.city}${ef.venue ? ` · ${ef.venue}` : ''}`, 50, 130);
    doc.fillColor(COLORS.text).fontSize(10)
      .text(`Covers ${vendors.length} vendor(s) on the roster.`, 50, 155);

    // Per-vendor sections
    for (const v of vendors) {
      doc.addPage();

      doc.fillColor(COLORS.purple).font('Helvetica-Bold').fontSize(8)
        .text((v.category ?? 'vendor').toUpperCase(), { characterSpacing: 1.5 });
      doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(18)
        .text(v.stage_name ?? 'Unnamed vendor');
      doc.moveDown(0.5);

      if (!v.rider_id) {
        doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(10)
          .text('No technical rider on file. Event company should request one before call sheet dispatch.');
        continue;
      }

      // Line items grouped by category
      if (v.line_items.length) {
        doc.fillColor(COLORS.cyan).font('Helvetica-Bold').fontSize(9)
          .text('TECHNICAL REQUIREMENTS', { characterSpacing: 1.2 });
        doc.moveDown(0.3);

        const byCat: Record<string, typeof v.line_items> = {};
        for (const li of v.line_items) {
          (byCat[li.category] ??= []).push(li);
        }
        for (const [cat, items] of Object.entries(byCat)) {
          doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8)
            .text(cat.toUpperCase(), { characterSpacing: 1 });
          doc.moveDown(0.2);
          for (const li of items) {
            const priorityColor = li.priority === 'must_have' ? COLORS.purple : COLORS.muted;
            doc.fillColor(COLORS.text).font('Helvetica').fontSize(10)
              .text(`• ${li.quantity}× ${li.item_name}`, { continued: true });
            doc.fillColor(priorityColor).font('Helvetica-Bold').fontSize(8)
              .text(`  [${li.priority}]`);
            if (li.specifications) {
              doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(9)
                .text(`    ${li.specifications}`);
            }
          }
          doc.moveDown(0.3);
        }
      }

      // Hospitality
      const hosp = v.hospitality_requirements;
      if (hosp && typeof hosp === 'object' && Object.keys(hosp).length > 0) {
        doc.moveDown(0.3);
        doc.fillColor(COLORS.cyan).font('Helvetica-Bold').fontSize(9)
          .text('HOSPITALITY', { characterSpacing: 1.2 });
        doc.fillColor(COLORS.text).font('Helvetica').fontSize(10);
        for (const [k, val] of Object.entries(hosp)) {
          doc.text(`• ${k}: ${typeof val === 'string' ? val : JSON.stringify(val)}`);
        }
      }

      // Travel
      const travel = v.travel_requirements;
      if (travel && typeof travel === 'object' && Object.keys(travel).length > 0) {
        doc.moveDown(0.3);
        doc.fillColor(COLORS.cyan).font('Helvetica-Bold').fontSize(9)
          .text('TRAVEL', { characterSpacing: 1.2 });
        doc.fillColor(COLORS.text).font('Helvetica').fontSize(10);
        for (const [k, val] of Object.entries(travel)) {
          doc.text(`• ${k}: ${typeof val === 'string' ? val : JSON.stringify(val)}`);
        }
      }

      // Notes
      if (v.notes) {
        doc.moveDown(0.4);
        doc.fillColor(COLORS.cyan).font('Helvetica-Bold').fontSize(9)
          .text('NOTES', { characterSpacing: 1.2 });
        doc.fillColor(COLORS.text).font('Helvetica').fontSize(10).text(v.notes);
      }
    }

    doc.end();
  });
}

async function renderXLSX(ef: any, vendors: VendorRider[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GRID';
  wb.created = new Date();

  const sheet = wb.addWorksheet('Consolidated Rider');

  sheet.mergeCells('A1:G1');
  sheet.getCell('A1').value = `Consolidated Rider — ${ef.event_name}`;
  sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF8A2BE2' } };

  const headerRow = 3;
  const headers = ['Vendor', 'Category', 'Rider Category', 'Item', 'Qty', 'Priority', 'Specifications'];
  headers.forEach((h, i) => {
    const cell = sheet.getCell(headerRow, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E0E0F' } };
  });

  let r = headerRow + 1;
  for (const v of vendors) {
    if (v.line_items.length === 0) {
      sheet.getCell(r, 1).value = v.stage_name ?? '';
      sheet.getCell(r, 2).value = v.category ?? '';
      sheet.getCell(r, 3).value = '(no rider on file)';
      sheet.getCell(r, 3).font = { italic: true, color: { argb: 'FF999999' } };
      r++;
      continue;
    }
    for (const li of v.line_items) {
      sheet.getCell(r, 1).value = v.stage_name ?? '';
      sheet.getCell(r, 2).value = v.category ?? '';
      sheet.getCell(r, 3).value = li.category;
      sheet.getCell(r, 4).value = li.item_name;
      sheet.getCell(r, 5).value = li.quantity;
      sheet.getCell(r, 6).value = li.priority;
      sheet.getCell(r, 7).value = li.specifications ?? '';
      if (li.priority === 'must_have') {
        sheet.getCell(r, 6).font = { bold: true, color: { argb: 'FF8A2BE2' } };
      }
      r++;
    }
  }

  sheet.getColumn(1).width = 24;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 16;
  sheet.getColumn(4).width = 36;
  sheet.getColumn(5).width = 6;
  sheet.getColumn(6).width = 12;
  sheet.getColumn(7).width = 44;

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function generateConsolidatedRider(eventFileId: string): Promise<ConsolidatedRiderBundle> {
  const { ef, vendors } = await loadConsolidated(eventFileId);
  const [pdf, xlsx] = await Promise.all([renderPDF(ef, vendors), renderXLSX(ef, vendors)]);

  const totalItems = vendors.reduce((sum, v) => sum + v.line_items.length, 0);
  const withRider = vendors.filter((v) => v.rider_id).length;

  return {
    pdf,
    xlsx,
    snapshot: {
      event_name: ef.event_name,
      vendor_count: vendors.length,
      vendors_with_rider: withRider,
      total_line_items: totalItems,
      generated_at: new Date().toISOString(),
    },
  };
}
