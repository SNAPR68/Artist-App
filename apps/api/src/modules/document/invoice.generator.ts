import crypto from 'crypto';

interface InvoiceData {
  payment_id: string;
  booking_id: string;
  invoice_number: string;
  invoice_date: string;

  // Supplier (Platform)
  platform_name: string;
  platform_gstin: string;
  platform_address: string;
  platform_state: string;
  platform_state_code: string;

  // Recipient
  recipient_name: string;
  recipient_gstin?: string;
  recipient_address?: string;
  recipient_state?: string;
  recipient_state_code?: string;

  // Amounts (all in paise)
  base_amount_paise: number;
  platform_fee_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  total_tax_paise: number;
  total_amount_paise: number;

  // Service details
  sac_code: string;
  description: string;
}

/**
 * Generate a GST-compliant invoice for the platform service fee.
 * SAC Code 999619 — Other entertainment services.
 *
 * If supplier state == recipient state → CGST (9%) + SGST (9%)
 * If different states → IGST (18%)
 */
export function generateInvoice(params: {
  payment_id: string;
  booking_id: string;
  platform_fee_paise: number;
  gst_paise: number;
  recipient_name: string;
  recipient_gstin?: string;
  recipient_state?: string;
  event_description: string;
}): InvoiceData {
  const { payment_id, booking_id, platform_fee_paise, gst_paise, recipient_name, recipient_gstin, recipient_state, event_description } = params;

  const platformState = 'Maharashtra';
  const platformStateCode = '27';
  const isSameState = !recipient_state || recipient_state === platformState;

  const cgst = isSameState ? Math.round(gst_paise / 2) : 0;
  const sgst = isSameState ? gst_paise - cgst : 0;
  const igst = isSameState ? 0 : gst_paise;

  const invoiceNumber = `ABP/${new Date().getFullYear()}/${payment_id.slice(0, 8).toUpperCase()}`;
  const totalAmount = platform_fee_paise + gst_paise;

  const invoice: InvoiceData = {
    payment_id,
    booking_id,
    invoice_number: invoiceNumber,
    invoice_date: new Date().toISOString().split('T')[0],

    platform_name: 'ArtistBooking Platform Pvt. Ltd.',
    platform_gstin: 'XXAAACA0000A1ZX', // Placeholder — real GSTIN in production config
    platform_address: 'Mumbai, Maharashtra, India',
    platform_state: platformState,
    platform_state_code: platformStateCode,

    recipient_name,
    recipient_gstin: recipient_gstin ?? undefined,
    recipient_state: recipient_state ?? undefined,
    recipient_state_code: recipient_state ? getStateCode(recipient_state) : undefined,

    base_amount_paise: platform_fee_paise,
    platform_fee_paise,
    cgst_paise: cgst,
    sgst_paise: sgst,
    igst_paise: igst,
    total_tax_paise: gst_paise,
    total_amount_paise: totalAmount,

    sac_code: '999619',
    description: event_description,
  };

  return invoice;
}

/**
 * Format invoice as structured JSON (for MVP).
 * In production, use pdfkit to generate a PDF and upload to S3.
 */
export function formatInvoiceDocument(invoice: InvoiceData) {
  const formatINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const doc = {
    document_type: 'gst_invoice',
    version: '1.0',
    ...invoice,

    formatted: {
      base_amount: formatINR(invoice.platform_fee_paise),
      cgst: invoice.cgst_paise > 0 ? `${formatINR(invoice.cgst_paise)} (9%)` : 'N/A',
      sgst: invoice.sgst_paise > 0 ? `${formatINR(invoice.sgst_paise)} (9%)` : 'N/A',
      igst: invoice.igst_paise > 0 ? `${formatINR(invoice.igst_paise)} (18%)` : 'N/A',
      total_tax: formatINR(invoice.total_tax_paise),
      total_amount: formatINR(invoice.total_amount_paise),
    },

    hash: '',
  };

  doc.hash = crypto.createHash('sha256').update(JSON.stringify({
    invoice_number: invoice.invoice_number,
    payment_id: invoice.payment_id,
    amounts: {
      base: invoice.base_amount_paise,
      cgst: invoice.cgst_paise,
      sgst: invoice.sgst_paise,
      igst: invoice.igst_paise,
      total: invoice.total_amount_paise,
    },
  })).digest('hex');

  return doc;
}

function getStateCode(state: string): string {
  const codes: Record<string, string> = {
    'Andhra Pradesh': '37', 'Arunachal Pradesh': '12', 'Assam': '18', 'Bihar': '10',
    'Chhattisgarh': '22', 'Goa': '30', 'Gujarat': '24', 'Haryana': '06',
    'Himachal Pradesh': '02', 'Jharkhand': '20', 'Karnataka': '29', 'Kerala': '32',
    'Madhya Pradesh': '23', 'Maharashtra': '27', 'Manipur': '14', 'Meghalaya': '17',
    'Mizoram': '15', 'Nagaland': '13', 'Odisha': '21', 'Punjab': '03',
    'Rajasthan': '08', 'Sikkim': '11', 'Tamil Nadu': '33', 'Telangana': '36',
    'Tripura': '16', 'Uttar Pradesh': '09', 'Uttarakhand': '05', 'West Bengal': '19',
    'Delhi': '07', 'Jammu and Kashmir': '01', 'Ladakh': '38',
  };
  return codes[state] ?? '99';
}
