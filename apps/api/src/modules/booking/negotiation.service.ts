import { db } from '../../infrastructure/database.js';
import { MAX_NEGOTIATION_ROUNDS, FINANCIAL } from '@artist-booking/shared';

export interface QuoteBreakdown {
  base_amount_paise: number;
  travel_surcharge_paise: number;
  platform_fee_paise: number;
  tds_paise: number;
  gst_on_platform_fee_paise: number;
  total_client_pays_paise: number;
  artist_receives_paise: number;
}

export class NegotiationService {
  /**
   * Generate an auto-quote from the artist's pricing matrix.
   */
  async generateAutoQuote(artistId: string, eventType: string, cityTier: string): Promise<QuoteBreakdown> {
    const artist = await db('artist_profiles').where({ id: artistId }).first();
    if (!artist) throw new NegotiationError('ARTIST_NOT_FOUND', 'Artist not found', 404);

    const pricing = typeof artist.pricing === 'string' ? JSON.parse(artist.pricing) : artist.pricing;

    // Find matching pricing entry
    const match = (pricing as Array<{ event_type: string; city_tier: string; min_price: number; max_price: number }>)
      ?.find((p) => p.event_type.toLowerCase() === eventType.toLowerCase() && p.city_tier === cityTier);

    // Use midpoint of range, or a default
    const baseAmount = match
      ? Math.round((match.min_price + match.max_price) / 2)
      : 10000000; // 1,00,000 INR in paise as fallback

    return this.calculateBreakdown(baseAmount);
  }

  /**
   * Calculate full payment breakdown from a base amount.
   */
  calculateBreakdown(baseAmountPaise: number, travelSurchargePaise = 0): QuoteBreakdown {
    const subtotal = baseAmountPaise + travelSurchargePaise;
    const platformFee = Math.round(subtotal * FINANCIAL.PLATFORM_FEE_RATE);
    const gstOnPlatformFee = Math.round(platformFee * FINANCIAL.GST_RATE);
    const totalClientPays = subtotal + platformFee + gstOnPlatformFee;

    // TDS deducted from artist share
    const tds = Math.round(subtotal * FINANCIAL.TDS_RATE);
    const artistReceives = subtotal - tds;

    return {
      base_amount_paise: baseAmountPaise,
      travel_surcharge_paise: travelSurchargePaise,
      platform_fee_paise: platformFee,
      tds_paise: tds,
      gst_on_platform_fee_paise: gstOnPlatformFee,
      total_client_pays_paise: totalClientPays,
      artist_receives_paise: artistReceives,
    };
  }

  /**
   * Submit a quote/counter-offer for a booking.
   */
  async submitQuote(bookingId: string, submittedBy: string, amountPaise: number, notes?: string) {
    // Check round count
    const existingQuotes = await db('booking_quotes')
      .where({ booking_id: bookingId })
      .orderBy('round', 'asc');

    const round = existingQuotes.length + 1;

    if (round > MAX_NEGOTIATION_ROUNDS) {
      throw new NegotiationError(
        'MAX_ROUNDS_EXCEEDED',
        `Maximum ${MAX_NEGOTIATION_ROUNDS} negotiation rounds reached. Submit a final offer.`,
        400,
      );
    }

    const breakdown = this.calculateBreakdown(amountPaise);

    const [quote] = await db('booking_quotes')
      .insert({
        booking_id: bookingId,
        submitted_by: submittedBy,
        round,
        amount_paise: amountPaise,
        breakdown: JSON.stringify(breakdown),
        notes: notes ?? null,
        is_final: round === MAX_NEGOTIATION_ROUNDS,
      })
      .returning('*');

    return { ...quote, breakdown };
  }

  /**
   * Get negotiation history for a booking.
   */
  async getQuoteHistory(bookingId: string) {
    const quotes = await db('booking_quotes')
      .where({ booking_id: bookingId })
      .orderBy('round', 'asc');

    return quotes.map((q: Record<string, unknown>) => ({
      ...q,
      breakdown: typeof q.breakdown === 'string' ? JSON.parse(q.breakdown as string) : q.breakdown,
    }));
  }

  /**
   * Get the latest quote for a booking.
   */
  async getLatestQuote(bookingId: string) {
    const quote = await db('booking_quotes')
      .where({ booking_id: bookingId })
      .orderBy('round', 'desc')
      .first();

    if (!quote) return null;

    return {
      ...quote,
      breakdown: typeof quote.breakdown === 'string' ? JSON.parse(quote.breakdown) : quote.breakdown,
    };
  }
}

export class NegotiationError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'NegotiationError';
  }
}

export const negotiationService = new NegotiationService();
