import crypto from 'crypto';

interface ContractData {
  booking_id: string;
  artist_name: string;
  client_name: string;
  event_type: string;
  event_date: string;
  event_city: string;
  event_venue?: string;
  event_duration_hours: number;
  final_amount_paise: number;
  platform_fee_paise: number;
  artist_payout_paise: number;
  tds_paise: number;
  gst_paise: number;
}

/**
 * Generate a contract document as structured data.
 * In production, this would use pdfkit to generate a PDF and upload to S3.
 * For MVP, we return the contract data structure.
 */
export function generateContract(data: ContractData) {
  const totalINR = (data.final_amount_paise / 100).toLocaleString('en-IN');
  const platformFeeINR = (data.platform_fee_paise / 100).toLocaleString('en-IN');
  const artistPayoutINR = (data.artist_payout_paise / 100).toLocaleString('en-IN');
  const tdsINR = (data.tds_paise / 100).toLocaleString('en-IN');
  const gstINR = (data.gst_paise / 100).toLocaleString('en-IN');

  const contract = {
    document_type: 'booking_contract',
    version: '1.0',
    generated_at: new Date().toISOString(),
    booking_id: data.booking_id,

    parties: {
      artist: { name: data.artist_name },
      client: { name: data.client_name },
      platform: { name: 'ArtistBooking Platform' },
    },

    event_details: {
      type: data.event_type,
      date: data.event_date,
      city: data.event_city,
      venue: data.event_venue ?? 'TBD',
      duration_hours: data.event_duration_hours,
    },

    financial_terms: {
      total_amount: `₹${totalINR}`,
      total_amount_paise: data.final_amount_paise,
      breakdown: {
        artist_fee: `₹${artistPayoutINR}`,
        platform_fee: `₹${platformFeeINR}`,
        tds_deducted: `₹${tdsINR}`,
        gst_on_platform: `₹${gstINR}`,
      },
      payment_terms: 'Full payment required upon booking confirmation. Funds held in escrow until event completion.',
    },

    cancellation_policy: {
      tiers: [
        { period: 'More than 30 days before event', refund: '100%' },
        { period: '15-30 days before event', refund: '75%' },
        { period: '7-14 days before event', refund: '50%' },
        { period: 'Less than 7 days before event', refund: '0%' },
      ],
    },

    terms: [
      'The Artist agrees to perform at the specified event with professional standards.',
      'The Client agrees to provide adequate venue, sound, and lighting arrangements unless otherwise specified.',
      'Payment will be held in escrow by the Platform and released to the Artist within 3 business days of event completion.',
      'TDS at 10% (Section 194J) will be deducted from the Artist\'s fee and deposited with the government.',
      'Either party may cancel subject to the cancellation policy above.',
      'The Platform charges a non-refundable service fee as specified in the financial terms.',
      'All disputes shall be subject to arbitration under Indian Arbitration and Conciliation Act, 1996.',
    ],

    hash: '', // Will be set below
  };

  // Generate SHA-256 hash of contract content
  const contentToHash = JSON.stringify({
    booking_id: contract.booking_id,
    parties: contract.parties,
    event_details: contract.event_details,
    financial_terms: contract.financial_terms,
  });
  contract.hash = crypto.createHash('sha256').update(contentToHash).digest('hex');

  return contract;
}
