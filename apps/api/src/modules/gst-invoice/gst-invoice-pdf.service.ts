import PDFDocument from 'pdfkit';
import type { GstInvoice, GstLineItem } from './gst-invoice.service.js';

const COLORS = {
  text: '#111111',
  muted: '#666666',
  light: '#999999',
  border: '#dddddd',
  brand: '#8A2BE2',
};

const fmtINR = (paise: number): string => '\u20B9' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function generateGstInvoicePdf(
  invoice: GstInvoice,
  lineItems: GstLineItem[],
  brandColor = COLORS.brand,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { width: pageWidth } = doc.page;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    // Header bar
    doc.rect(0, 0, pageWidth, 6).fill(brandColor);

    // Title
    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(22)
      .text('TAX INVOICE', margin, 30);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
      .text(`Invoice #${invoice.invoice_number}`, margin, 58)
      .text(`Issue Date: ${invoice.issue_date}`, margin, 72)
      .text(invoice.due_date ? `Due: ${invoice.due_date}` : '', margin, 86);

    // Supplier block (right)
    const supplierX = margin + contentWidth / 2;
    doc.fontSize(10).fillColor(COLORS.text).font('Helvetica-Bold').text(invoice.supplier_legal_name, supplierX, 30);
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
    if (invoice.supplier_address) doc.text(invoice.supplier_address, supplierX, 44, { width: contentWidth / 2 });
    if (invoice.supplier_gstin) doc.text(`GSTIN: ${invoice.supplier_gstin}`, supplierX, 86);
    if (invoice.supplier_pan) doc.text(`PAN: ${invoice.supplier_pan}`, supplierX, 98);

    // Bill-to
    doc.y = 130;
    doc.fontSize(8).fillColor(COLORS.light).font('Helvetica-Bold').text('BILL TO', margin, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor(COLORS.text).font('Helvetica-Bold').text(invoice.recipient_name, margin);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted);
    if (invoice.recipient_address) doc.text(invoice.recipient_address, margin, doc.y, { width: contentWidth / 2 });
    if (invoice.recipient_gstin) doc.text(`GSTIN: ${invoice.recipient_gstin}`, margin);
    if (invoice.recipient_email) doc.text(invoice.recipient_email, margin);

    // Line items table
    doc.y += 20;
    const tableTop = doc.y;
    const cols = {
      desc: margin,
      sac: margin + 240,
      qty: margin + 290,
      rate: margin + 330,
      tax: margin + 400,
      amt: margin + 450,
    };
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.light);
    doc.text('DESCRIPTION', cols.desc, tableTop);
    doc.text('SAC', cols.sac, tableTop);
    doc.text('QTY', cols.qty, tableTop);
    doc.text('UNIT \u20B9', cols.rate, tableTop);
    doc.text('GST%', cols.tax, tableTop);
    doc.text('AMOUNT', cols.amt, tableTop, { width: contentWidth - (cols.amt - margin), align: 'right' });

    doc.moveTo(margin, tableTop + 14).lineTo(margin + contentWidth, tableTop + 14).strokeColor(COLORS.border).stroke();

    let y = tableTop + 22;
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
    for (const li of lineItems) {
      doc.text(li.description, cols.desc, y, { width: 230 });
      doc.text(li.sac_code, cols.sac, y);
      doc.text(String(li.quantity), cols.qty, y);
      doc.text((li.unit_price_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 }), cols.rate, y);
      doc.text(`${li.tax_rate}%`, cols.tax, y);
      doc.text(fmtINR(li.amount_paise), cols.amt, y, { width: contentWidth - (cols.amt - margin), align: 'right' });
      y = Math.max(y + 18, doc.y + 6);
    }

    doc.moveTo(margin, y + 4).lineTo(margin + contentWidth, y + 4).strokeColor(COLORS.border).stroke();
    y += 12;

    // Totals block (right-aligned)
    const totalsX = margin + contentWidth - 200;
    const labelW = 100;
    const valueW = 100;
    const writeTotalRow = (label: string, value: string, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(bold ? COLORS.text : COLORS.muted);
      doc.text(label, totalsX, y, { width: labelW });
      doc.text(value, totalsX + labelW, y, { width: valueW, align: 'right' });
      y += 15;
    };

    writeTotalRow('Subtotal', fmtINR(invoice.subtotal_paise));
    if (invoice.tax_mode === 'intra') {
      writeTotalRow('CGST', fmtINR(invoice.cgst_paise));
      writeTotalRow('SGST', fmtINR(invoice.sgst_paise));
    } else {
      writeTotalRow('IGST', fmtINR(invoice.igst_paise));
    }
    // Divider before total
    doc.moveTo(totalsX, y).lineTo(totalsX + labelW + valueW, y).strokeColor(COLORS.border).stroke();
    y += 6;
    writeTotalRow('TOTAL', fmtINR(invoice.total_paise), true);

    // Notes
    if (invoice.notes) {
      y += 20;
      doc.fontSize(8).fillColor(COLORS.light).font('Helvetica-Bold').text('NOTES', margin, y);
      y += 12;
      doc.fontSize(9).fillColor(COLORS.muted).font('Helvetica').text(invoice.notes, margin, y, { width: contentWidth });
    }

    // Footer
    doc.fontSize(7).fillColor(COLORS.light).font('Helvetica')
      .text(
        'This is a computer-generated invoice and does not require a signature.',
        margin,
        doc.page.height - 40,
        { width: contentWidth, align: 'center' },
      );

    doc.end();
  });
}
