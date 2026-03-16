import PDFDocument from 'pdfkit';

const COLORS = {
  primary: '#1a1a2e',
  accent: '#e94560',
  text: '#333333',
  muted: '#666666',
  light: '#f5f5f5',
  border: '#dddddd',
};

const formatINR = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

/**
 * Render a booking contract as a PDF buffer.
 */
export async function renderContractPDF(contract: {
  booking_id: string;
  generated_at: string;
  parties: { artist: { name: string }; client: { name: string }; platform: { name: string } };
  event_details: { type: string; date: string; city: string; venue: string; duration_hours: number };
  financial_terms: {
    total_amount: string;
    total_amount_paise: number;
    breakdown: { artist_fee: string; platform_fee: string; tds_deducted: string; gst_on_platform: string };
    payment_terms: string;
  };
  cancellation_policy: { tiers: { period: string; refund: string }[] };
  terms: string[];
  hash: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(22).fillColor(COLORS.primary).text('BOOKING CONTRACT', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor(COLORS.muted).text('ArtistBooking Platform', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(8).text(`Contract ID: ${contract.booking_id}`, { align: 'center' });
    doc.text(`Generated: ${new Date(contract.generated_at).toLocaleDateString('en-IN')}`, { align: 'center' });
    doc.moveDown(1);

    // Divider
    drawDivider(doc);

    // Parties
    sectionHeader(doc, 'PARTIES');
    doc.fontSize(10).fillColor(COLORS.text);
    doc.text(`Artist: ${contract.parties.artist.name}`);
    doc.text(`Client: ${contract.parties.client.name}`);
    doc.text(`Platform: ${contract.parties.platform.name}`);
    doc.moveDown(0.8);

    // Event Details
    sectionHeader(doc, 'EVENT DETAILS');
    doc.fontSize(10).fillColor(COLORS.text);
    const ed = contract.event_details;
    tableRow(doc, 'Event Type', ed.type);
    tableRow(doc, 'Date', new Date(ed.date).toLocaleDateString('en-IN', { dateStyle: 'long' }));
    tableRow(doc, 'City', ed.city);
    tableRow(doc, 'Venue', ed.venue);
    tableRow(doc, 'Duration', `${ed.duration_hours} hour(s)`);
    doc.moveDown(0.8);

    // Financial Terms
    sectionHeader(doc, 'FINANCIAL TERMS');
    doc.fontSize(10).fillColor(COLORS.text);
    const ft = contract.financial_terms;
    tableRow(doc, 'Total Amount', ft.total_amount);
    tableRow(doc, 'Artist Fee', ft.breakdown.artist_fee);
    tableRow(doc, 'Platform Fee', ft.breakdown.platform_fee);
    tableRow(doc, 'TDS (10%)', ft.breakdown.tds_deducted);
    tableRow(doc, 'GST on Platform Fee', ft.breakdown.gst_on_platform);
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor(COLORS.muted).text(ft.payment_terms);
    doc.moveDown(0.8);

    // Cancellation Policy
    sectionHeader(doc, 'CANCELLATION POLICY');
    for (const tier of contract.cancellation_policy.tiers) {
      doc.fontSize(10).fillColor(COLORS.text);
      doc.text(`• ${tier.period}: ${tier.refund} refund`);
    }
    doc.moveDown(0.8);

    // Terms & Conditions
    sectionHeader(doc, 'TERMS & CONDITIONS');
    contract.terms.forEach((term, i) => {
      doc.fontSize(9).fillColor(COLORS.text);
      doc.text(`${i + 1}. ${term}`, { lineGap: 3 });
    });
    doc.moveDown(1);

    // Signature lines
    drawDivider(doc);
    doc.moveDown(1.5);
    const y = doc.y;
    doc.fontSize(10).fillColor(COLORS.text);
    doc.text('_________________________', 50, y);
    doc.text('Artist Signature', 50, y + 15);
    doc.text('_________________________', 350, y);
    doc.text('Client Signature', 350, y + 15);
    doc.moveDown(2);

    // Hash footer
    doc.fontSize(7).fillColor(COLORS.muted);
    doc.text(`Document Hash (SHA-256): ${contract.hash}`, 50, doc.page.height - 40, { width: 500 });

    doc.end();
  });
}

/**
 * Render a GST invoice as a PDF buffer.
 */
export async function renderInvoicePDF(invoice: {
  invoice_number: string;
  invoice_date: string;
  payment_id: string;
  booking_id: string;
  platform_name: string;
  platform_gstin: string;
  platform_address: string;
  platform_state: string;
  recipient_name: string;
  recipient_gstin?: string;
  recipient_state?: string;
  sac_code: string;
  description: string;
  platform_fee_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  total_tax_paise: number;
  total_amount_paise: number;
  hash: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).fillColor(COLORS.primary).text('TAX INVOICE', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor(COLORS.accent).text(invoice.invoice_number, { align: 'center' });
    doc.fontSize(9).fillColor(COLORS.muted).text(`Date: ${invoice.invoice_date}`, { align: 'center' });
    doc.moveDown(1);
    drawDivider(doc);

    // Supplier & Recipient side by side
    const topY = doc.y + 10;
    doc.fontSize(9).fillColor(COLORS.primary).text('FROM (Supplier)', 50, topY, { underline: true });
    doc.fontSize(9).fillColor(COLORS.text);
    doc.text(invoice.platform_name, 50, topY + 15);
    doc.text(`GSTIN: ${invoice.platform_gstin}`, 50, topY + 28);
    doc.text(invoice.platform_address, 50, topY + 41);
    doc.text(`State: ${invoice.platform_state}`, 50, topY + 54);

    doc.fontSize(9).fillColor(COLORS.primary).text('TO (Recipient)', 320, topY, { underline: true });
    doc.fontSize(9).fillColor(COLORS.text);
    doc.text(invoice.recipient_name, 320, topY + 15);
    if (invoice.recipient_gstin) doc.text(`GSTIN: ${invoice.recipient_gstin}`, 320, topY + 28);
    if (invoice.recipient_state) doc.text(`State: ${invoice.recipient_state}`, 320, topY + 41);

    doc.y = topY + 80;
    doc.moveDown(0.5);
    drawDivider(doc);

    // Line items
    sectionHeader(doc, 'SERVICE DETAILS');
    doc.fontSize(9).fillColor(COLORS.text);
    tableRow(doc, 'SAC Code', invoice.sac_code);
    tableRow(doc, 'Description', invoice.description);
    tableRow(doc, 'Taxable Value', formatINR(invoice.platform_fee_paise));
    doc.moveDown(0.5);

    // Tax breakdown
    sectionHeader(doc, 'TAX BREAKDOWN');
    if (invoice.cgst_paise > 0) {
      tableRow(doc, 'CGST @ 9%', formatINR(invoice.cgst_paise));
      tableRow(doc, 'SGST @ 9%', formatINR(invoice.sgst_paise));
    }
    if (invoice.igst_paise > 0) {
      tableRow(doc, 'IGST @ 18%', formatINR(invoice.igst_paise));
    }
    tableRow(doc, 'Total Tax', formatINR(invoice.total_tax_paise));
    doc.moveDown(0.5);
    drawDivider(doc);

    // Total
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor(COLORS.primary).text(`Total: ${formatINR(invoice.total_amount_paise)}`, { align: 'right' });
    doc.moveDown(2);

    // Footer
    doc.fontSize(8).fillColor(COLORS.muted);
    doc.text('This is a computer-generated invoice and does not require a physical signature.', 50);
    doc.moveDown(0.3);
    doc.text(`Payment Ref: ${invoice.payment_id} | Booking Ref: ${invoice.booking_id}`);

    // Hash
    doc.fontSize(7).fillColor(COLORS.muted);
    doc.text(`Document Hash (SHA-256): ${invoice.hash}`, 50, doc.page.height - 40, { width: 500 });

    doc.end();
  });
}

function sectionHeader(doc: any, title: string) {
  doc.fontSize(11).fillColor(COLORS.accent).text(title, { underline: true });
  doc.moveDown(0.3);
}

function tableRow(doc: any, label: string, value: string) {
  const y = doc.y;
  doc.fontSize(9).fillColor(COLORS.muted).text(label, 60, y, { width: 180 });
  doc.fontSize(9).fillColor(COLORS.text).text(value, 250, y, { width: 280 });
  doc.y = y + 16;
}

function drawDivider(doc: any) {
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.moveDown(0.5);
}
