/**
 * Proposal-with-P&L (2026-05-05) — Proposal PDF generator.
 *
 * Two modes:
 *   - 'internal' — full P&L: cost + sell + margin %. EC-only.
 *   - 'client'   — sell prices only, branded for the workspace.
 *
 * Uses pdfkit (codebase standard). Returns a Buffer.
 */
import PDFDocument from 'pdfkit';

const COLORS = {
  primary: '#0e0e0f',
  accent: '#8A2BE2',
  text: '#1a1a1d',
  muted: '#666666',
  light: '#f5f5f5',
  border: '#dddddd',
  ok: '#16a34a',
};

const formatINR = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const formatPct = (n: number | string | null | undefined) =>
  n == null ? '—' : `${Number(n).toFixed(2)}%`;

export interface ProposalPdfInput {
  proposal: {
    id: string;
    client_name: string;
    client_email: string | null;
    event_title: string;
    event_date: string | null;
    venue_text: string | null;
    status: string;
    version: number;
    valid_until: string | null;
    total_cost_paise: number | string;
    total_sell_paise: number | string;
    margin_pct: number | string | null;
    sent_at: string | null;
  };
  line_items: Array<{
    category: string;
    description: string;
    qty: number | string;
    cost_paise: number | string;
    sell_paise: number | string;
  }>;
  workspace: { name: string; logo_url?: string | null; brand_color?: string | null };
  mode: 'internal' | 'client';
}

export async function renderProposalPdf(input: ProposalPdfInput): Promise<Buffer> {
  const { proposal, line_items, workspace, mode } = input;
  const showCost = mode === 'internal';
  const accent = workspace.brand_color || COLORS.accent;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc
      .fontSize(22)
      .fillColor(accent)
      .text(workspace.name, { align: 'left' });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor(COLORS.muted).text('Event Proposal', { align: 'left' });
    doc.moveDown(0.2);
    doc.fontSize(9).text(`Proposal ID: ${proposal.id.slice(0, 8)} · v${proposal.version}`);
    if (proposal.valid_until) {
      doc.text(`Valid until: ${proposal.valid_until}`);
    }
    doc.moveDown(1);

    // Client + Event
    doc.fontSize(12).fillColor(COLORS.text).text(`Prepared for: ${proposal.client_name}`);
    if (proposal.client_email) doc.fontSize(9).fillColor(COLORS.muted).text(proposal.client_email);
    doc.moveDown(0.6);
    doc.fontSize(14).fillColor(COLORS.text).text(proposal.event_title);
    if (proposal.event_date) {
      doc.fontSize(10).fillColor(COLORS.muted).text(`Event date: ${proposal.event_date}`);
    }
    if (proposal.venue_text) {
      doc.fontSize(10).fillColor(COLORS.muted).text(`Venue: ${proposal.venue_text}`);
    }
    doc.moveDown(1);

    // Line items table
    doc.fontSize(11).fillColor(COLORS.text).text('Line items', { underline: false });
    doc.moveDown(0.4);

    const startX = doc.x;
    const tableTop = doc.y;
    const cols = showCost
      ? [
          { label: 'Category', x: startX, w: 70 },
          { label: 'Description', x: startX + 70, w: 200 },
          { label: 'Qty', x: startX + 270, w: 30 },
          { label: 'Cost', x: startX + 305, w: 60 },
          { label: 'Sell', x: startX + 370, w: 60 },
          { label: 'Margin', x: startX + 435, w: 60 },
        ]
      : [
          { label: 'Category', x: startX, w: 80 },
          { label: 'Description', x: startX + 80, w: 280 },
          { label: 'Qty', x: startX + 365, w: 40 },
          { label: 'Amount', x: startX + 410, w: 90 },
        ];

    doc.fontSize(9).fillColor(COLORS.muted);
    cols.forEach((c) => doc.text(c.label, c.x, tableTop, { width: c.w }));
    doc
      .moveTo(startX, tableTop + 14)
      .lineTo(startX + 500, tableTop + 14)
      .strokeColor(COLORS.border)
      .stroke();

    let y = tableTop + 20;
    doc.fontSize(9).fillColor(COLORS.text);
    for (const li of line_items) {
      const qty = Number(li.qty);
      const cost = Number(li.cost_paise) * qty;
      const sell = Number(li.sell_paise) * qty;
      const marginPct = sell > 0 ? ((sell - cost) / sell) * 100 : 0;

      if (showCost) {
        doc.text(li.category, cols[0].x, y, { width: cols[0].w });
        doc.text(li.description, cols[1].x, y, { width: cols[1].w });
        doc.text(String(qty), cols[2].x, y, { width: cols[2].w });
        doc.text(formatINR(cost), cols[3].x, y, { width: cols[3].w });
        doc.text(formatINR(sell), cols[4].x, y, { width: cols[4].w });
        doc.text(formatPct(marginPct), cols[5].x, y, { width: cols[5].w });
      } else {
        doc.text(li.category, cols[0].x, y, { width: cols[0].w });
        doc.text(li.description, cols[1].x, y, { width: cols[1].w });
        doc.text(String(qty), cols[2].x, y, { width: cols[2].w });
        doc.text(formatINR(sell), cols[3].x, y, { width: cols[3].w });
      }

      y += 22;
      if (y > 720) {
        doc.addPage();
        y = 50;
      }
    }

    doc.y = y + 10;
    doc.x = startX;

    // Totals
    doc
      .moveTo(startX, doc.y)
      .lineTo(startX + 500, doc.y)
      .strokeColor(COLORS.border)
      .stroke();
    doc.moveDown(0.5);

    const totalCost = Number(proposal.total_cost_paise);
    const totalSell = Number(proposal.total_sell_paise);

    doc.fontSize(11).fillColor(COLORS.text);
    doc.text(`Total: ${formatINR(totalSell)}`, { align: 'right' });
    if (showCost) {
      doc.fontSize(9).fillColor(COLORS.muted);
      doc.text(`Cost basis: ${formatINR(totalCost)}`, { align: 'right' });
      doc.text(
        `Margin: ${formatINR(totalSell - totalCost)} (${formatPct(proposal.margin_pct)})`,
        { align: 'right' },
      );
    }
    doc.moveDown(2);

    // Footer
    if (mode === 'client') {
      doc.fontSize(9).fillColor(COLORS.muted);
      doc.text('Acceptance: review and confirm via the link shared with you.', {
        align: 'left',
      });
    } else {
      doc.fontSize(8).fillColor(COLORS.muted);
      doc.text('INTERNAL — contains cost & margin. Do not share with client.', {
        align: 'center',
      });
    }

    doc.end();
  });
}
