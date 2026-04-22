/**
 * Event Company OS pivot (2026-04-22) — Call sheet generator.
 *
 * Given an event_file_id, produces:
 *   - PDF (pdfkit): 1-page cinematic call sheet matching Nocturne branding
 *   - Excel (exceljs): single tidy sheet with vendor roster + timing columns
 *
 * Source of truth: event_files row + event_file_vendors join. call_time on the
 * parent file is the default; per-vendor call_time_override wins when set.
 */
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { db } from '../../infrastructure/database.js';

const COLORS = {
  ink: '#0e0e0f',
  purple: '#c39bff',
  cyan: '#a1faff',
  gold: '#ffbf00',
  text: '#333333',
  muted: '#666666',
  border: '#dddddd',
  light: '#f5f5f5',
};

export interface CallSheetBundle {
  pdf: Buffer;
  xlsx: Buffer;
  snapshot: {
    event_name: string;
    event_date: string;
    call_time: string | null;
    city: string;
    venue: string | null;
    vendor_count: number;
    generated_at: string;
  };
}

interface VendorRow {
  id: string;
  role: string;
  stage_name: string | null;
  category: string | null;
  call_time_override: string | null;
  notes: string | null;
  phone_e164: string | null;
  base_city: string | null;
}

async function loadEventFile(eventFileId: string) {
  const ef = await db('event_files').where({ id: eventFileId, deleted_at: null }).first();
  if (!ef) throw new Error('EVENT_FILE_NOT_FOUND');

  const client = await db('users as u')
    .leftJoin('client_profiles as cp', 'cp.user_id', 'u.id')
    .where('u.id', ef.client_id)
    .select('cp.company_name as name', 'u.phone', 'u.email')
    .first();

  const vendors: VendorRow[] = await db('event_file_vendors as efv')
    .leftJoin('artist_profiles as ap', 'efv.vendor_profile_id', 'ap.id')
    .leftJoin('users as u', 'u.id', 'ap.user_id')
    .where('efv.event_file_id', eventFileId)
    .orderBy([{ column: 'efv.call_time_override', order: 'asc' }, { column: 'ap.category' }])
    .select(
      'efv.id',
      'efv.role',
      'efv.call_time_override',
      'efv.notes',
      'ap.stage_name',
      'ap.category',
      'ap.base_city',
      'u.phone as phone_e164',
    );

  return { ef, client, vendors };
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function fmtTime(t: string | null | undefined): string {
  if (!t) return '—';
  // Accept HH:MM, HH:MM:SS, or ISO; show HH:MM.
  const m = t.match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : t;
}

async function renderPDF(
  ef: any,
  client: any,
  vendors: VendorRow[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Masthead bar
    doc.rect(0, 0, doc.page.width, 64).fill(COLORS.ink);
    doc.fillColor(COLORS.purple).fontSize(9).font('Helvetica-Bold')
      .text('GRID · CALL SHEET', 40, 22, { characterSpacing: 2 });
    doc.fillColor(COLORS.cyan).fontSize(9).font('Helvetica')
      .text(`Generated ${new Date().toLocaleString('en-IN')}`, 40, 40);

    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(22)
      .text(ef.event_name, 40, 84, { width: doc.page.width - 80 });

    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(10)
      .text(fmtDate(ef.event_date), 40, 118);

    // Key facts row
    const factY = 140;
    const facts = [
      { label: 'MASTER CALL', value: fmtTime(ef.call_time) },
      { label: 'CITY', value: ef.city ?? '—' },
      { label: 'VENUE', value: ef.venue ?? '—' },
      { label: 'VENDORS', value: String(vendors.length) },
    ];
    const colW = (doc.page.width - 80) / facts.length;
    facts.forEach((f, i) => {
      const x = 40 + i * colW;
      doc.fillColor(COLORS.muted).fontSize(7).font('Helvetica-Bold')
        .text(f.label, x, factY, { characterSpacing: 1.5 });
      doc.fillColor(COLORS.ink).fontSize(13).font('Helvetica-Bold')
        .text(f.value, x, factY + 12, { width: colW - 10 });
    });

    // Client block
    const clientY = factY + 58;
    doc.moveTo(40, clientY).lineTo(doc.page.width - 40, clientY)
      .strokeColor(COLORS.border).lineWidth(0.5).stroke();

    doc.fillColor(COLORS.purple).fontSize(8).font('Helvetica-Bold')
      .text('CLIENT / EVENT COMPANY', 40, clientY + 10, { characterSpacing: 1.2 });
    const clientLine = [
      client?.name ?? `${ef.event_name} · ${ef.city}`,
      client?.phone,
      client?.email,
    ].filter(Boolean).join('   ·   ');
    doc.fillColor(COLORS.text).fontSize(10).font('Helvetica')
      .text(clientLine, 40, clientY + 24, { width: doc.page.width - 80 });

    // Vendor roster header
    let tableY = clientY + 54;
    doc.fillColor(COLORS.cyan).fontSize(8).font('Helvetica-Bold')
      .text('VENDOR ROSTER', 40, tableY, { characterSpacing: 1.2 });
    tableY += 18;

    const cols = [
      { key: 'time', header: 'CALL', x: 40, w: 55 },
      { key: 'role', header: 'ROLE', x: 98, w: 90 },
      { key: 'name', header: 'VENDOR', x: 191, w: 150 },
      { key: 'category', header: 'CAT', x: 344, w: 55 },
      { key: 'phone', header: 'PHONE', x: 402, w: 90 },
      { key: 'city', header: 'CITY', x: 495, w: 60 },
    ];

    // Header row
    doc.fillColor(COLORS.muted).fontSize(7).font('Helvetica-Bold');
    cols.forEach((c) => doc.text(c.header, c.x, tableY, { width: c.w, characterSpacing: 1 }));
    tableY += 12;
    doc.moveTo(40, tableY - 2).lineTo(doc.page.width - 40, tableY - 2)
      .strokeColor(COLORS.border).lineWidth(0.5).stroke();

    // Body
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
    if (vendors.length === 0) {
      doc.fillColor(COLORS.muted).text('No vendors on roster yet.', 40, tableY + 6);
    } else {
      for (const v of vendors) {
        if (tableY > doc.page.height - 80) {
          doc.addPage();
          tableY = 50;
        }
        const rowData: Record<string, string> = {
          time: fmtTime(v.call_time_override ?? ef.call_time),
          role: v.role ?? '—',
          name: v.stage_name ?? '—',
          category: v.category ?? '—',
          phone: v.phone_e164 ?? '—',
          city: v.base_city ?? '—',
        };
        cols.forEach((c) => {
          doc.fillColor(c.key === 'time' ? COLORS.purple : COLORS.text)
            .font(c.key === 'time' ? 'Helvetica-Bold' : 'Helvetica')
            .text(rowData[c.key], c.x, tableY, { width: c.w, ellipsis: true });
        });
        tableY += 16;
        if (v.notes) {
          doc.fillColor(COLORS.muted).fontSize(8).font('Helvetica-Oblique')
            .text(`↳ ${v.notes}`, 98, tableY, { width: doc.page.width - 140 });
          tableY += 12;
          doc.fontSize(9);
        }
      }
    }

    // Footer
    doc.fillColor(COLORS.muted).fontSize(7).font('Helvetica')
      .text(
        `Call sheet for ${ef.event_name} · generated by GRID. Vendors — keep this for reference.`,
        40,
        doc.page.height - 40,
        { width: doc.page.width - 80, align: 'center' },
      );

    doc.end();
  });
}

async function renderXLSX(
  ef: any,
  client: any,
  vendors: VendorRow[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GRID';
  wb.created = new Date();

  const sheet = wb.addWorksheet('Call Sheet', {
    pageSetup: { paperSize: 9, orientation: 'landscape' },
    properties: { defaultColWidth: 18 },
  });

  // Event header block
  sheet.mergeCells('A1:F1');
  sheet.getCell('A1').value = `GRID · CALL SHEET — ${ef.event_name}`;
  sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF8A2BE2' } };

  sheet.getCell('A2').value = 'Date';
  sheet.getCell('B2').value = fmtDate(ef.event_date);
  sheet.getCell('A3').value = 'Master Call';
  sheet.getCell('B3').value = fmtTime(ef.call_time);
  sheet.getCell('A4').value = 'City';
  sheet.getCell('B4').value = ef.city ?? '';
  sheet.getCell('A5').value = 'Venue';
  sheet.getCell('B5').value = ef.venue ?? '';
  sheet.getCell('A6').value = 'Client';
  sheet.getCell('B6').value = `${client?.name ?? ''} · ${client?.phone ?? ''} · ${client?.email ?? ''}`;

  for (let r = 2; r <= 6; r++) {
    sheet.getCell(`A${r}`).font = { bold: true, color: { argb: 'FF666666' } };
  }

  // Roster table starting at row 8
  const headerRow = 8;
  const headers = ['Call Time', 'Role', 'Vendor', 'Category', 'Phone', 'City', 'Notes'];
  headers.forEach((h, i) => {
    const cell = sheet.getCell(headerRow, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0E0E0F' },
    };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
  });

  // Body
  vendors.forEach((v, idx) => {
    const r = headerRow + 1 + idx;
    const values = [
      fmtTime(v.call_time_override ?? ef.call_time),
      v.role ?? '',
      v.stage_name ?? '',
      v.category ?? '',
      v.phone_e164 ?? '',
      v.base_city ?? '',
      v.notes ?? '',
    ];
    values.forEach((val, i) => {
      const cell = sheet.getCell(r, i + 1);
      cell.value = val;
      if (i === 0) cell.font = { bold: true, color: { argb: 'FF8A2BE2' } };
      if (idx % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' },
        };
      }
    });
  });

  // Column widths
  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 20;
  sheet.getColumn(3).width = 28;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 18;
  sheet.getColumn(6).width = 14;
  sheet.getColumn(7).width = 40;

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function generateCallSheet(eventFileId: string): Promise<CallSheetBundle> {
  const { ef, client, vendors } = await loadEventFile(eventFileId);
  const [pdf, xlsx] = await Promise.all([
    renderPDF(ef, client, vendors),
    renderXLSX(ef, client, vendors),
  ]);

  return {
    pdf,
    xlsx,
    snapshot: {
      event_name: ef.event_name,
      event_date: ef.event_date,
      call_time: ef.call_time ?? null,
      city: ef.city,
      venue: ef.venue ?? null,
      vendor_count: vendors.length,
      generated_at: new Date().toISOString(),
    },
  };
}
