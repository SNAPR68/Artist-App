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
  action?: {
    type: 'navigate' | 'execute';
    route?: string;
    params?: Record<string, unknown>;
  };
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
    conversationContext: ConversationContext,
  ): Promise<VoiceExecutionResult> {
    const userRole = (conversationContext.session_state?.user_role as string) || 'artist';

    switch (parsedIntent.intent) {
      case 'DISCOVER':
        return this.handleDiscover(parsedIntent, userId);

      case 'STATUS':
        return this.handleStatus(parsedIntent, userId);

      case 'ACTION':
        return this.handleAction(parsedIntent, userRole);

      case 'INTELLIGENCE':
        return this.handleIntelligence(parsedIntent, userId);

      case 'EMERGENCY':
        return this.handleEmergency(parsedIntent, userId);

      case 'NAVIGATE':
        return this.handleNavigate(parsedIntent, userRole);

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
    userRole: string,
  ): Promise<VoiceExecutionResult> {
    const { booking_id, action_verb } = parsedIntent.entities;
    const lower = parsedIntent.raw_text.toLowerCase();

    // Confirm / accept booking
    if ((action_verb === 'confirm' || action_verb === 'accept') && booking_id) {
      const bookingRoute = userRole === 'client'
        ? `/client/bookings/${booking_id}`
        : `/artist/bookings/${booking_id}`;
      return {
        response_text: `Opening booking details so you can confirm.`,
        suggestions: ['Show all bookings', 'Go home'],
        action: { type: 'navigate', route: bookingRoute },
      };
    }

    // Cancel / reject booking
    if ((action_verb === 'cancel' || action_verb === 'reject') && booking_id) {
      const bookingRoute = userRole === 'client'
        ? `/client/bookings/${booking_id}`
        : `/artist/bookings/${booking_id}`;
      return {
        response_text: `Opening booking details so you can cancel.`,
        suggestions: ['Show all bookings', 'Go home'],
        action: { type: 'navigate', route: bookingRoute },
      };
    }

    // Create / post gig
    if (/create\s*gig|post\s*gig|new\s*gig|list\s*gig/.test(lower)) {
      return {
        response_text: `Taking you to the gig marketplace to create a post.`,
        suggestions: ['Show my gigs', 'Go home'],
        action: { type: 'navigate', route: '/gigs' },
      };
    }

    // Generate / download PDF
    if (/generate\s*pdf|download\s*pdf|export\s*pdf|pdf\s*ban/.test(lower)) {
      return {
        response_text: `You can generate PDFs from the presentations page in your workspace. Head there to create branded proposals and contracts.`,
        suggestions: ['Open workspace', 'Show bookings', 'Go home'],
        action: { type: 'navigate', route: userRole === 'client' || userRole === 'event_company' ? '/client/workspace' : '/artist/bookings' },
      };
    }

    // Book an artist (with or without name)
    if (action_verb === 'book') {
      const artistName = parsedIntent.entities.artist_name;
      if (artistName) {
        return {
          response_text: `Let me find ${artistName} so you can start the booking process.`,
          suggestions: [`Search for ${artistName}`, 'Show recommendations', 'Go home'],
          action: { type: 'navigate', route: `/search?q=${encodeURIComponent(artistName)}` },
        };
      }
      return {
        response_text: `Let's find the right artist for your event. Taking you to search.`,
        suggestions: ['Show recommendations', 'Browse gigs', 'Go home'],
        action: { type: 'navigate', route: '/search' },
      };
    }

    // Schedule / block date
    if (action_verb === 'schedule' || /block\s*date/.test(lower)) {
      return {
        response_text: `Opening your calendar to manage availability.`,
        suggestions: ['Show bookings', 'Go home'],
        action: { type: 'navigate', route: '/artist/calendar' },
      };
    }

    // Fallback for unknown actions
    const action = action_verb || 'perform this action';
    const idText = booking_id ? ` for booking ${booking_id.slice(0, 8)}...` : '';
    return {
      response_text: `I can help you ${action}${idText}. Try being more specific, like "confirm booking" or "create a gig post".`,
      suggestions: [
        'Show my bookings',
        'Go to gig marketplace',
        'Check booking status',
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
  // ─── NAVIGATE ──────────────────────────────────────────

  private async handleNavigate(
    parsedIntent: VoiceParsedIntent,
    userRole: string,
  ): Promise<VoiceExecutionResult> {
    const pageTarget = parsedIntent.entities.page_target;

    if (!pageTarget) {
      return {
        response_text: 'Where would you like to go? You can say things like "show my bookings" or "go to calendar".',
        suggestions: ['Show bookings', 'Go to calendar', 'Open gigs marketplace', 'Show earnings'],
      };
    }

    const ROUTE_MAP: Record<string, Record<string, string>> = {
      bookings: { artist: '/artist/bookings', client: '/client/bookings', agent: '/agent/bookings', event_company: '/client/bookings', admin: '/admin' },
      calendar: { artist: '/artist/calendar', client: '/search', agent: '/search' },
      earnings: { artist: '/artist/earnings' },
      financial: { artist: '/artist/financial' },
      intelligence: { artist: '/artist/intelligence' },
      'gig-advisor': { artist: '/artist/intelligence/gig-advisor' },
      profile: { artist: '/artist/profile', client: '/client', agent: '/agent' },
      workspace: { client: '/client/workspace', event_company: '/client/workspace' },
      gigs: { artist: '/gigs', client: '/gigs', agent: '/gigs', event_company: '/gigs', admin: '/gigs' },
      search: { artist: '/search', client: '/search', agent: '/search', event_company: '/search', admin: '/search' },
      notifications: { artist: '/notifications', client: '/notifications', agent: '/notifications', event_company: '/notifications', admin: '/notifications' },
      settings: { artist: '/settings', client: '/settings', agent: '/settings', event_company: '/settings' },
      home: { artist: '/artist', client: '/client', agent: '/agent', event_company: '/client', admin: '/admin' },
      seasonal: { artist: '/artist/seasonal' },
      reputation: { artist: '/artist/intelligence/reputation' },
      gamification: { artist: '/artist/gamification' },
      recommendations: { client: '/client/recommendations', event_company: '/client/recommendations', agent: '/agent/recommendations' },
      shortlists: { client: '/client/shortlists', event_company: '/client/shortlists' },
      substitutions: { client: '/client/substitutions', event_company: '/client/substitutions' },
    };

    const routeMap = ROUTE_MAP[pageTarget];
    const route = routeMap?.[userRole] || routeMap?.['artist'] || routeMap?.['client'];

    if (!route) {
      return {
        response_text: `Sorry, that page isn't available for your account. Try saying "show my bookings" or "go home".`,
        suggestions: ['Show bookings', 'Go home', 'Open gigs'],
      };
    }

    const pageNames: Record<string, string> = {
      bookings: 'your bookings', calendar: 'your calendar', earnings: 'your earnings',
      financial: 'your financial dashboard', intelligence: 'your intelligence dashboard',
      'gig-advisor': 'the gig advisor', profile: 'your profile', workspace: 'your workspace',
      gigs: 'the gig marketplace', search: 'artist search', notifications: 'your notifications',
      settings: 'settings', home: 'home', seasonal: 'seasonal trends',
      reputation: 'your reputation', gamification: 'your achievements',
      recommendations: 'recommendations', shortlists: 'your shortlists', substitutions: 'substitution requests',
    };

    return {
      response_text: `Taking you to ${pageNames[pageTarget] || pageTarget}.`,
      suggestions: ['Go back', 'Show bookings', 'Go home'],
      action: { type: 'navigate', route },
    };
  }
}

export const voiceExecutionService = new VoiceExecutionService();
