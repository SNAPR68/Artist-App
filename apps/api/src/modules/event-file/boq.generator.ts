/**
 * Event Company OS pivot (2026-04-22) — BOQ (Bill of Quantities) generator.
 *
 * Produces PDF + Excel from the persisted `boq_line_items` for an event file.
 * Caller is responsible for seeding/editing line items before calling this.
 * Generator is pure render — no DB writes, no side effects.
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
  zebra: '#f7f5fb',
};

export interface BOQLineItem {
  id: string;
  vendor_profile_id: string | null;
  vendor_name: string | null;
  category: string;
  description: string;
  quantity: number;
  unit_price_inr: number;
  line_total_inr: number;
  gst_rate_pct: number | null;
  sort_order: number;
}

export interface BOQBundle {
  pdf: Buffer;
  xlsx: Buffer;
  totals: {
    subtotal_inr: number;
    gst_inr: number;
    total_inr: number;
    line_item_count: number;
  };
}

function inr(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

async function loadBOQ(eventFileId: string) {
  const ef = await db('event_files').where({ id: eventFileId, deleted_at: null }).first();
  if (!ef) throw new Error('EVENT_FILE_NOT_FOUND');

  const rows = await db('boq_line_items as bli')
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

  const items: BOQLineItem[] = rows.map((r) => ({
    id: r.id,
    vendor_profile_id: r.vendor_profile_id,
    vendor_name: r.vendor_name,
    category: r.category,
    description: r.description,
    quantity: Number(r.quantity),
    unit_price_inr: Number(r.unit_price_inr),
    line_total_inr: Number(r.line_total_inr),
    gst_rate_pct: r.gst_rate_pct === null ? null : Number(r.gst_rate_pct),
    sort_order: r.sort_order,
  }));

  let subtotal = 0;
  let gst = 0;
  for (const it of items) {
    subtotal += it.line_total_inr;
    if (it.gst_rate_pct !== null) {
      gst += (it.line_total_inr * it.gst_rate_pct) / 100;
    }
  }
  const total = subtotal + gst;

  return {
    ef,
    items,
    totals: {
      subtotal_inr: round2(subtotal),
      gst_inr: round2(gst),
      total_inr: round2(total),
      line_item_count: items.length,
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function renderPDF(
  ef: any,
  items: BOQLineItem[],
  totals: BOQBundle['totals'],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Masthead
    doc.rect(0, 0, doc.page.width, 72).fill(COLORS.ink);
    doc.fillColor(COLORS.purple).font('Helvetica-Bold').fontSize(9)
      .text('GRID · BILL OF QUANTITIES', 48, 28, { characterSpacing: 2 });
    doc.fillColor(COLORS.cyan).font('Helvetica').fontSize(9)
      .text(new Date().toLocaleString('en-IN'), 48, 46);

    // Event block
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(20)
      .text(ef.event_name, 48, 96);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(11)
      .text(`${ef.event_date} · ${ef.city}${ef.venue ? ` · ${ef.venue}` : ''}`, 48, 122);

    // Table header
    const headerY = 170;
    const cols = [
      { x: 48, w: 30, label: '#' },
      { x: 78, w: 70, label: 'CATEGORY' },
      { x: 148, w: 100, label: 'VENDOR' },
      { x: 248, w: 160, label: 'DESCRIPTION' },
      { x: 408, w: 30, label: 'QTY' },
      { x: 438, w: 55, label: 'UNIT ₹' },
      { x: 493, w: 60, label: 'TOTAL ₹' },
    ];

    doc.rect(48, headerY, doc.page.width - 96, 22).fill(COLORS.ink);
    doc.fillColor(COLORS.purple).font('Helvetica-Bold').fontSize(8);
    for (const c of cols) {
      doc.text(c.label, c.x + 4, headerY + 7, { width: c.w - 8, characterSpacing: 1 });
    }

    // Body
    let y = headerY + 22;
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
    items.forEach((it, idx) => {
      const rowH = 22;
      if (y + rowH > doc.page.height - 140) {
        doc.addPage();
        y = 48;
      }
      if (idx % 2 === 1) {
        doc.rect(48, y, doc.page.width - 96, rowH).fill(COLORS.zebra);
        doc.fillColor(COLORS.text);
      }
      doc.text(String(idx + 1), cols[0].x + 4, y + 7, { width: cols[0].w - 8 });
      doc.text(it.category, cols[1].x + 4, y + 7, { width: cols[1].w - 8 });
      doc.text(it.vendor_name ?? '—', cols[2].x + 4, y + 7, { width: cols[2].w - 8 });
      doc.text(it.description, cols[3].x + 4, y + 7, { width: cols[3].w - 8 });
      doc.text(String(it.quantity), cols[4].x + 4, y + 7, { width: cols[4].w - 8 });
      doc.text(inr(it.unit_price_inr), cols[5].x + 4, y + 7, { width: cols[5].w - 8, align: 'right' });
      doc.text(inr(it.line_total_inr), cols[6].x + 4, y + 7, { width: cols[6].w - 8, align: 'right' });
      y += rowH;
    });

    // Totals
    const tY = y + 16;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink);
    doc.text('Subtotal', 380, tY, { width: 80 });
    doc.text(`₹ ${inr(totals.subtotal_inr)}`, 460, tY, { width: 100, align: 'right' });
    doc.text('GST', 380, tY + 16, { width: 80 });
    doc.text(`₹ ${inr(totals.gst_inr)}`, 460, tY + 16, { width: 100, align: 'right' });
    doc.fontSize(12).fillColor(COLORS.ink);
    doc.text('Grand Total', 380, tY + 38, { width: 80 });
    doc.fillColor('#8A2BE2')
      .text(`₹ ${inr(totals.total_inr)}`, 460, tY + 38, { width: 100, align: 'right' });

    doc.end();
  });
}

async function renderXLSX(
  ef: any,
  items: BOQLineItem[],
  totals: BOQBundle['totals'],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GRID';
  wb.created = new Date();

  const sheet = wb.addWorksheet('BOQ');

  sheet.mergeCells('A1:H1');
  sheet.getCell('A1').value = `Bill of Quantities — ${ef.event_name}`;
  sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF8A2BE2' } };

  sheet.getCell('A2').value = `${ef.event_date} · ${ef.city}${ef.venue ? ` · ${ef.venue}` : ''}`;
  sheet.getCell('A2').font = { italic: true, color: { argb: 'FF666666' } };

  const headerRow = 4;
  const headers = ['#', 'Category', 'Vendor', 'Description', 'Qty', 'Unit (INR)', 'GST %', 'Line Total (INR)'];
  headers.forEach((h, i) => {
    const cell = sheet.getCell(headerRow, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E0E0F' } };
    cell.alignment = { vertical: 'middle', horizontal: i === 0 || i === 4 ? 'center' : 'left' };
  });

  let r = headerRow + 1;
  items.forEach((it, idx) => {
    sheet.getCell(r, 1).value = idx + 1;
    sheet.getCell(r, 2).value = it.category;
    sheet.getCell(r, 3).value = it.vendor_name ?? '';
    sheet.getCell(r, 4).value = it.description;
    sheet.getCell(r, 5).value = it.quantity;
    sheet.getCell(r, 6).value = it.unit_price_inr;
    sheet.getCell(r, 7).value = it.gst_rate_pct ?? '';
    sheet.getCell(r, 8).value = it.line_total_inr;

    sheet.getCell(r, 6).numFmt = '#,##0.00';
    sheet.getCell(r, 8).numFmt = '#,##0.00';
    r++;
  });

  // Totals
  r += 1;
  sheet.getCell(r, 7).value = 'Subtotal';
  sheet.getCell(r, 7).font = { bold: true };
  sheet.getCell(r, 8).value = totals.subtotal_inr;
  sheet.getCell(r, 8).numFmt = '#,##0.00';
  r++;
  sheet.getCell(r, 7).value = 'GST';
  sheet.getCell(r, 7).font = { bold: true };
  sheet.getCell(r, 8).value = totals.gst_inr;
  sheet.getCell(r, 8).numFmt = '#,##0.00';
  r++;
  sheet.getCell(r, 7).value = 'Grand Total';
  sheet.getCell(r, 7).font = { bold: true, color: { argb: 'FF8A2BE2' } };
  sheet.getCell(r, 8).value = totals.total_inr;
  sheet.getCell(r, 8).numFmt = '#,##0.00';
  sheet.getCell(r, 8).font = { bold: true, color: { argb: 'FF8A2BE2' } };

  sheet.getColumn(1).width = 5;
  sheet.getColumn(2).width = 14;
  sheet.getColumn(3).width = 22;
  sheet.getColumn(4).width = 40;
  sheet.getColumn(5).width = 8;
  sheet.getColumn(6).width = 14;
  sheet.getColumn(7).width = 10;
  sheet.getColumn(8).width = 16;

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function generateBOQ(eventFileId: string): Promise<BOQBundle> {
  const { ef, items, totals } = await loadBOQ(eventFileId);
  const [pdf, xlsx] = await Promise.all([
    renderPDF(ef, items, totals),
    renderXLSX(ef, items, totals),
  ]);
  return { pdf, xlsx, totals };
}
