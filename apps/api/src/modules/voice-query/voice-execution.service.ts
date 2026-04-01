/**
 * Execution pipeline: routes parsed voice intents to the appropriate service
 * and formats responses for voice output.
 */

import { db } from '../../infrastructure/database.js';
import type { VoiceParsedIntent } from './voice-intent.service.js';
import type { VoiceCard, VoiceFollowUp } from '@artist-booking/shared';

// ─── Types ──────────────────────────────────────────────────

export interface VoiceExecutionResult {
  response_text: string;
  data?: Record<string, unknown>;
  cards?: VoiceCard[];
  follow_up?: VoiceFollowUp;
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

      case 'BRIEF':
        return this.handleBrief(parsedIntent, userId);

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
      const query = db('artist_profiles as ap')
        .leftJoin('users as u', 'u.id', 'ap.user_id')
        .where('ap.deleted_at', null)
        .orderBy('ap.trust_score', 'desc')
        .limit(5);

      if (city) query.where('ap.base_city', 'ilike', `%${city}%`);
      if (genre) query.whereRaw('ap.genres @> ?', [JSON.stringify([genre])]);

      const rawResults = await query.select(
        'ap.id', 'ap.stage_name', 'ap.genres', 'ap.trust_score', 'ap.base_city',
        'ap.bio', 'ap.total_bookings', 'ap.pricing',
        db.raw('COALESCE(u.is_verified, false) as is_verified'),
      );

      // Fetch thumbnails for fallback results
      const ids = rawResults.map((a: any) => a.id);
      const thumbs = ids.length > 0
        ? await db('media_items')
            .whereIn('artist_id', ids)
            .where({ deleted_at: null })
            .orderBy('sort_order', 'asc')
            .select('artist_id', 'thumbnail_url', 'original_url')
        : [];
      const thumbMap = new Map(thumbs.map((t: any) => [t.artist_id, t.thumbnail_url ?? t.original_url]));

      results = rawResults.map((a: any) => ({
        ...a,
        thumbnail_url: thumbMap.get(a.id) ?? null,
      }));
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

    const response = `I found ${results.length} artist${results.length > 1 ? 's' : ''} matching your search. Here are the top picks.`;
    const firstArtist = results[0] as Record<string, unknown>;
    const firstName = firstArtist.stage_name as string;

    // Build visual cards for each artist
    const cards: VoiceCard[] = results.map((a: Record<string, unknown>) => {
      const pricing = Array.isArray(a.pricing) ? a.pricing[0] : null;
      return {
        type: 'artist_discover' as const,
        data: {
          id: a.id,
          stage_name: a.stage_name,
          artist_type: a.artist_type ?? a.category,
          genres: a.genres,
          trust_score: a.trust_score ? Number(a.trust_score) : undefined,
          base_city: a.base_city,
          thumbnail_url: a.thumbnail_url ?? null,
          is_verified: a.is_verified ?? false,
          total_bookings: a.total_bookings ? Number(a.total_bookings) : undefined,
          price_min_paise: pricing?.min_paise ?? pricing?.min_price ? Number(pricing.min_price) * 100 : null,
          price_max_paise: pricing?.max_paise ?? pricing?.max_price ? Number(pricing.max_price) * 100 : null,
        },
      };
    });

    return {
      response_text: response,
      data: { artists: results },
      cards,
      follow_up: {
        question: 'Want me to check availability for any of them?',
        options: [`Tell me about ${firstName}`, 'Show more results', 'Plan my event'],
      },
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
        response_text: `Your booking with ${artistName} is currently ${booking.state}. Amount: ${amount}.`,
        data: { booking },
        cards: [{
          type: 'booking_status',
          data: {
            id: booking.id,
            artist_name: artistName,
            artist_thumbnail: artist?.profile_image ?? null,
            event_type: booking.event_type,
            event_date: booking.event_date,
            venue_city: booking.venue_city,
            status: booking.state,
            amount_paise: booking.agreed_amount ? Number(booking.agreed_amount) : undefined,
          },
        }],
        follow_up: booking.state === 'confirmed'
          ? { question: 'Need to send coordination details?', options: ['Yes', 'Show other bookings'] }
          : undefined,
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

    const response = `Here are your ${bookings.length} recent booking${bookings.length > 1 ? 's' : ''}.`;

    // Fetch artist names for the booking cards
    const artistIds = [...new Set(bookings.map((b: any) => b.artist_id).filter(Boolean))];
    const artistMap = new Map<string, string>();
    if (artistIds.length > 0) {
      const artists = await db('artist_profiles').whereIn('user_id', artistIds).select('user_id', 'stage_name', 'profile_image');
      for (const a of artists) artistMap.set(a.user_id, a.stage_name);
    }

    const cards: VoiceCard[] = bookings.map((b: any) => ({
      type: 'booking_status' as const,
      data: {
        id: b.id,
        artist_name: artistMap.get(b.artist_id) || 'Artist',
        event_type: b.event_type,
        event_date: b.event_date,
        status: b.state,
        amount_paise: b.agreed_amount ? Number(b.agreed_amount) : undefined,
      },
    }));

    return {
      response_text: response,
      data: { bookings },
      cards,
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
          const totalPaise = Number(snapshot.summary?.total_revenue_paise || 0);
          const total = `₹${(totalPaise / 100).toLocaleString('en-IN')}`;
          const bookingCount = snapshot.summary?.total_bookings || 0;
          return {
            response_text: `Your total earnings this month: ${total} from ${bookingCount} booking${bookingCount !== 1 ? 's' : ''}.`,
            data: { earnings: snapshot },
            cards: [{
              type: 'earnings_summary',
              data: {
                total_paise: totalPaise,
                period: 'This Month',
                booking_count: bookingCount,
                change_pct: (snapshot.summary as any)?.growth_pct ?? null,
                top_gigs: ((snapshot as any).recent_bookings || snapshot.snapshots || []).slice(0, 3).map((b: any) => ({
                  event_type: b.event_type,
                  amount_paise: Number(b.amount_paise || b.agreed_amount || 0),
                  date: b.event_date || b.created_at,
                })),
              },
            }],
            follow_up: {
              question: 'Would you like to see how this compares to last month?',
              options: ['Yes, compare', 'Show demand trends', 'Check market position'],
            },
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
  // ─── BRIEF (Decision Engine) ────────────────────────────

  private async handleBrief(
    parsedIntent: VoiceParsedIntent,
    userId: string,
  ): Promise<VoiceExecutionResult> {
    const { city, event_type, budget, date, genre } = parsedIntent.entities;

    try {
      const { decisionEngineService } = await import('../decision-engine/decision-engine.service.js');

      // Build brief input from extracted entities
      const briefInput: Record<string, unknown> = {
        raw_text: parsedIntent.raw_text,
        source: 'voice',
      };
      if (event_type) briefInput.event_type = event_type;
      if (city) briefInput.city = city;
      if (date) briefInput.event_date = date;
      if (budget) briefInput.budget_max_paise = Math.round(budget * 100);
      if (genre) briefInput.genres = [genre];

      const result = await decisionEngineService.createBriefAndRecommend(
        userId || null,
        briefInput as any,
      );

      if (!result || !result.recommendations || result.recommendations.length === 0) {
        return {
          response_text: `I couldn't find strong matches for your event. Try adding more details like city, budget, or event type.`,
          follow_up: {
            question: 'Want me to broaden the search?',
            options: ['Yes, broaden search', 'Try different city', 'Talk to concierge'],
          },
          suggestions: ['Find artists in Mumbai', 'Show all DJs', 'Plan a different event'],
        };
      }

      const topArtist = result.recommendations[0];
      const topName = topArtist.artist_name || 'a highly-rated artist';
      const response = `I found ${result.recommendations.length} great options for your event. The top recommendation is ${topName} with a ${Math.round((topArtist.confidence ?? 0) * 100)}% confidence score.`;

      // Build recommendation cards
      const cards: VoiceCard[] = result.recommendations.map((rec: any) => ({
        type: 'artist_recommendation' as const,
        data: {
          id: rec.artist_id,
          stage_name: rec.artist_name || 'Artist',
          artist_type: rec.artist_type,
          thumbnail_url: rec.profile_image ?? null,
          score: rec.score,
          confidence: rec.confidence,
          rank: rec.rank,
          price_min_paise: rec.price_min_paise ? Number(rec.price_min_paise) : null,
          price_max_paise: rec.price_max_paise ? Number(rec.price_max_paise) : null,
          expected_close_paise: rec.expected_close_paise ? Number(rec.expected_close_paise) : null,
          why_fit: Array.isArray(rec.why_fit) ? rec.why_fit : [],
          risk_flags: Array.isArray(rec.risk_flags) ? rec.risk_flags : [],
          logistics_flags: Array.isArray(rec.logistics_flags) ? rec.logistics_flags : [],
          score_breakdown: rec.score_breakdown,
        },
      }));

      return {
        response_text: response,
        data: { brief_id: result.brief_id, recommendations: result.recommendations },
        cards,
        follow_up: {
          question: 'Should I generate a proposal for the top pick?',
          options: ['Yes, send proposal', 'Show me more details', 'Lock availability'],
        },
        suggestions: [
          `Tell me more about ${topName}`,
          'Generate proposal',
          'Lock availability',
        ],
      };
    } catch (err: any) {
      return {
        response_text: `I had trouble processing your event brief. ${err?.message || 'Please try again.'}`,
        suggestions: ['Try again', 'Find artists manually', 'Talk to concierge'],
      };
    }
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
      payments: { client: '/client/payments', event_company: '/client/payments' },
      team: { client: '/client/workspace', event_company: '/client/workspace' },
      roster: { agent: '/agent/roster' },
      commissions: { agent: '/agent/commissions' },
      backup: { artist: '/artist/settings/backup' },
      voice: { artist: '/voice', client: '/voice', agent: '/voice', event_company: '/voice', admin: '/voice' },
      brief: { artist: '/brief', client: '/brief', agent: '/brief', event_company: '/brief', admin: '/brief' },
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
      payments: 'your payments', team: 'team management', roster: 'your artist roster',
      commissions: 'your commissions', backup: 'backup settings', voice: 'voice assistant',
      brief: 'the event planner',
    };

    return {
      response_text: `Taking you to ${pageNames[pageTarget] || pageTarget}.`,
      suggestions: ['Go back', 'Show bookings', 'Go home'],
      action: { type: 'navigate', route },
    };
  }
}

export const voiceExecutionService = new VoiceExecutionService();
