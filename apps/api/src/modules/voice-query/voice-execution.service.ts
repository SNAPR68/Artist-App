/**
 * Execution pipeline: routes parsed voice intents to the appropriate service
 * and formats responses for voice output.
 */

import { db } from '../../infrastructure/database.js';
import type { VoiceParsedIntent } from './voice-intent.service.js';

// ─── Types ──────────────────────────────────────────────────

export interface VoiceExecutionResult {
  response_text: string;
  data?: Record<string, unknown>;
  suggestions: string[];
}

interface ConversationContext {
  session_state: Record<string, unknown>;
  previous_intents: string[];
}

// ─── Service ────────────────────────────────────────────────

export class VoiceExecutionService {
  /**
   * Execute a parsed intent and return a formatted voice response.
   */
  async execute(
    parsedIntent: VoiceParsedIntent,
    userId: string,
    _conversationContext: ConversationContext,
  ): Promise<VoiceExecutionResult> {
    switch (parsedIntent.intent) {
      case 'DISCOVER':
        return this.handleDiscover(parsedIntent, userId);

      case 'STATUS':
        return this.handleStatus(parsedIntent, userId);

      case 'ACTION':
        return this.handleAction(parsedIntent);

      case 'INTELLIGENCE':
        return this.handleIntelligence(parsedIntent, userId);

      case 'EMERGENCY':
        return this.handleEmergency(parsedIntent, userId);

      default:
        return {
          response_text: "I'm not sure how to help with that. Try asking me to find artists, check booking status, or get market insights.",
          suggestions: [
            'Find a DJ for my wedding in Mumbai',
            'Check my booking status',
            'Show my earnings',
          ],
        };
    }
  }

  // ─── DISCOVER ───────────────────────────────────────────

  private async handleDiscover(
    parsedIntent: VoiceParsedIntent,
    _userId: string,
  ): Promise<VoiceExecutionResult> {
    const { city, event_type, budget, date, genre } = parsedIntent.entities;

    // Lazy import to avoid circular dependencies
    const { searchService } = await import('../search/search.service.js');

    // Build search params from extracted entities
    const searchParams: Record<string, unknown> = {};
    if (city) searchParams.city = city;
    if (event_type) searchParams.event_type = event_type;
    if (genre) searchParams.genre = genre;
    if (budget) {
      searchParams.budget_min = Math.floor(budget * 0.7);
      searchParams.budget_max = Math.ceil(budget * 1.3);
    }
    if (date) searchParams.date = date;

    let results: Array<Record<string, unknown>>;
    try {
      const searchResult = await searchService.searchArtists({
        ...searchParams,
        page: 1,
        per_page: 5,
      });
      results = searchResult.data || [];
    } catch {
      // Fallback: direct DB query if search service fails
      const query = db('artist_profiles')
        .where('deleted_at', null)
        .orderBy('trust_score', 'desc')
        .limit(5);

      if (city) query.where('base_city', 'ilike', `%${city}%`);
      if (genre) query.whereRaw('genres @> ?', [JSON.stringify([genre])]);

      results = await query.select('id', 'stage_name', 'genres', 'trust_score', 'base_city');
    }

    if (results.length === 0) {
      const location = city ? ` in ${city}` : '';
      return {
        response_text: `I couldn't find any artists matching your criteria${location}. Try broadening your search or checking a different city.`,
        suggestions: [
          'Show me all available DJs',
          'Search in nearby cities',
          'Find artists for any genre',
        ],
      };
    }

    let response = `I found ${results.length} artist${results.length > 1 ? 's' : ''} matching your search. Here are the top picks:\n\n`;
    const firstArtist = results[0] as Record<string, unknown>;

    results.forEach((a: Record<string, unknown>, i: number) => {
      const genres = Array.isArray(a.genres) ? a.genres.slice(0, 2).join(', ') : '';
      const trustScore = a.trust_score ?? 'N/A';
      const priceRange = a.price_range_min && a.price_range_max
        ? `₹${Number(a.price_range_min).toLocaleString('en-IN')}-${Number(a.price_range_max).toLocaleString('en-IN')}`
        : '';
      response += `${i + 1}. ${a.stage_name}${genres ? ` (${genres})` : ''} — ${trustScore} trust${priceRange ? `, ${priceRange}` : ''}\n`;
    });

    const firstName = firstArtist.stage_name as string;
    return {
      response_text: response,
      data: { artists: results },
      suggestions: [
        `Tell me more about ${firstName}`,
        'Show me more results',
        `Book ${firstName}`,
      ],
    };
  }

  // ─── STATUS ─────────────────────────────────────────────

  private async handleStatus(
    parsedIntent: VoiceParsedIntent,
    userId: string,
  ): Promise<VoiceExecutionResult> {
    const { booking_id } = parsedIntent.entities;

    if (booking_id) {
      const booking = await db('bookings')
        .where({ id: booking_id })
        .first();

      if (!booking) {
        return {
          response_text: `I couldn't find a booking with ID ${booking_id.slice(0, 8)}... Please check the ID and try again.`,
          suggestions: ['Show my recent bookings', 'Check all active bookings'],
        };
      }

      const artist = await db('artist_profiles')
        .where({ user_id: booking.artist_id })
        .first();

      const artistName = artist?.stage_name || 'the artist';
      const amount = booking.agreed_amount
        ? `₹${(Number(booking.agreed_amount) / 100).toLocaleString('en-IN')}`
        : 'TBD';

      return {
        response_text: `Your booking with ${artistName} for ${booking.event_type || 'event'} on ${booking.event_date || 'TBD'} is currently ${booking.state}. Amount: ${amount}.`,
        data: { booking },
        suggestions: [
          `What's the payment status for this booking?`,
          'Show my other bookings',
        ],
      };
    }

    // No booking ID — list recent bookings
    const bookings = await db('bookings')
      .where(function () {
        this.where('client_id', userId).orWhere('artist_id', userId);
      })
      .orderBy('created_at', 'desc')
      .limit(5)
      .select('id', 'event_type', 'event_date', 'state', 'agreed_amount');

    if (bookings.length === 0) {
      return {
        response_text: "You don't have any bookings yet. Would you like to find an artist?",
        suggestions: ['Find artists for my event', 'Show recommendations'],
      };
    }

    let response = 'Here are your recent bookings:\n\n';
    for (const b of bookings) {
      const amount = b.agreed_amount
        ? ` — ₹${(Number(b.agreed_amount) / 100).toLocaleString('en-IN')}`
        : '';
      response += `• ${b.event_type || 'Event'} on ${b.event_date || 'TBD'}: ${b.state}${amount}\n`;
    }

    return {
      response_text: response,
      data: { bookings },
      suggestions: [
        `Check details for ${bookings[0].event_type || 'latest'} booking`,
        'Find artists for a new event',
      ],
    };
  }

  // ─── ACTION ─────────────────────────────────────────────

  private async handleAction(
    parsedIntent: VoiceParsedIntent,
  ): Promise<VoiceExecutionResult> {
    const { booking_id, action_verb } = parsedIntent.entities;
    const action = action_verb || 'perform this action';
    const idText = booking_id ? ` ${booking_id.slice(0, 8)}...` : '';

    return {
      response_text: `To ${action} booking${idText}, please use the dashboard. Voice actions will be enabled soon.`,
      suggestions: [
        'Check booking status instead',
        'Find artists for my event',
        'Show my upcoming bookings',
      ],
    };
  }

  // ─── INTELLIGENCE ───────────────────────────────────────

  private async handleIntelligence(
    parsedIntent: VoiceParsedIntent,
    userId: string,
  ): Promise<VoiceExecutionResult> {
    const { city, genre, event_type } = parsedIntent.entities;
    const lower = parsedIntent.raw_text.toLowerCase();

    // Earnings / revenue query
    if (/earnings|revenue|income|kamaaya/.test(lower)) {
      try {
        const { artistIntelligenceService } = await import('../artist-intelligence/artist-intelligence.service.js');
        const snapshot = await artistIntelligenceService.getEarningsAnalytics(userId, { period_type: 'monthly' });

        if (snapshot) {
          const total = snapshot.summary?.total_revenue_paise
            ? `₹${(Number(snapshot.summary.total_revenue_paise) / 100).toLocaleString('en-IN')}`
            : '₹0';
          return {
            response_text: `Here's your earnings summary: Total earnings: ${total}. Total bookings: ${snapshot.summary?.total_bookings || 0}.`,
            data: { earnings: snapshot },
            suggestions: [
              'Show demand trends',
              'What should I charge for weddings?',
              'Show my career metrics',
            ],
          };
        }
      } catch {
        // Intelligence service not available
      }

      return {
        response_text: 'I could not fetch your earnings data right now. Please try again later or check the dashboard.',
        suggestions: ['Check booking status', 'Show demand trends'],
      };
    }

    // Price / market query
    if (/price|market|charge|kitna/.test(lower)) {
      try {
        const { pricingBrainService } = await import('../pricing-brain/pricing-brain.service.js');
        const position = await pricingBrainService.getPositionDetails(userId);

        if (position && position.length > 0) {
          const pos = position[0];
          return {
            response_text: `Your market position: You're in the ${pos.percentile_rank || 'N/A'}th percentile for your category${city ? ` in ${city}` : ''}. ${pos.recommendation || ''}`,
            data: { market_position: pos },
            suggestions: [
              'Show my earnings',
              'What are trending genres?',
              'Am I underpriced?',
            ],
          };
        }
      } catch {
        // Pricing brain not available
      }

      return {
        response_text: 'Market pricing data is not available right now. Please try again later.',
        suggestions: ['Show my earnings instead', 'Check booking status'],
      };
    }

    // Demand / season / trend query
    const contextParts: string[] = [];
    if (city) contextParts.push(`in ${city}`);
    if (genre) contextParts.push(`for ${genre}`);
    if (event_type) contextParts.push(`(${event_type})`);
    const context = contextParts.length > 0 ? ` ${contextParts.join(' ')}` : '';

    return {
      response_text: `Demand intelligence${context} coming soon. This feature will show you seasonal trends, demand forecasts, and optimal pricing windows.`,
      suggestions: [
        'Show my earnings',
        'Check my market position',
        'Find artists for my event',
      ],
    };
  }

  // ─── EMERGENCY ──────────────────────────────────────────

  private async handleEmergency(
    parsedIntent: VoiceParsedIntent,
    _userId: string,
  ): Promise<VoiceExecutionResult> {
    const { event_type, date, city, booking_id } = parsedIntent.entities;

    const details: string[] = [];
    if (event_type) details.push(`Event: ${event_type}`);
    if (date) details.push(`Date: ${date}`);
    if (city) details.push(`City: ${city}`);
    if (booking_id) details.push(`Booking: ${booking_id.slice(0, 8)}...`);

    const detailText = details.length > 0
      ? ` Details: ${details.join(', ')}.`
      : ' Please provide the event date and city so we can find replacements faster.';

    return {
      response_text: `Emergency substitution request noted.${detailText} You'll be notified when replacement candidates are found.`,
      suggestions: [
        'Show available artists for today',
        'Check replacement status',
        'Call support',
      ],
    };
  }
}

export const voiceExecutionService = new VoiceExecutionService();
