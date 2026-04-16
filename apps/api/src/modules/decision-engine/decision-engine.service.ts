import {
  DECISION_ENGINE_WEIGHTS,
  DECISION_ENGINE_MAX_CANDIDATES,
  DECISION_ENGINE_TOP_N,
  RISING_STAR_MAX_BOOKINGS,
  RISING_STAR_MIN_TRUST,
} from '@artist-booking/shared';
import { db } from '../../infrastructure/database.js';
import { decisionEngineRepository } from './decision-engine.repository.js';
import { conciergeService } from '../concierge/concierge.service.js';
import { workspaceService } from '../workspace/workspace.service.js';

// ─── Types ──────────────────────────────────────────────────

interface ParsedBrief {
  event_type: string | null;
  city: string | null;
  event_date: string | null;
  audience_size: number | null;
  budget_min_paise: number | null;
  budget_max_paise: number | null;
  genres: string[];
  vibe_tags: string[];
  is_family_safe: boolean;
  confidence: number;
}

interface ScoredCandidate {
  artist: Record<string, unknown>;
  scores: {
    event_type_fit: number;
    audience_vibe_fit: number;
    budget_fit: number;
    reliability: number;
    logistics: number;
    momentum: number;
    strategic: number;
  };
  total: number;
  why_fit: string[];
  risk_flags: string[];
  logistics_flags: string[];
  price_min_paise: number;
  price_max_paise: number;
  expected_close_paise: number | null;
}

// ─── Constants for parsing ──────────────────────────────────

const INDIAN_CITIES = [
  'mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'chennai',
  'kolkata', 'pune', 'ahmedabad', 'jaipur', 'lucknow', 'chandigarh',
  'indore', 'bhopal', 'nagpur', 'surat', 'vadodara', 'goa',
  'kochi', 'thiruvananthapuram', 'coimbatore', 'mysore', 'udaipur',
  'gurgaon', 'gurugram', 'noida', 'ghaziabad', 'faridabad',
  'navi mumbai', 'thane', 'visakhapatnam', 'patna', 'ranchi',
];

const EVENT_TYPE_KEYWORDS: Record<string, string> = {
  wedding: 'wedding', shaadi: 'wedding', vivah: 'wedding', sangeet: 'wedding', mehendi: 'wedding',
  corporate: 'corporate', office: 'corporate', company: 'corporate',
  party: 'private_party', birthday: 'private_party', kitty: 'private_party', house: 'private_party',
  concert: 'concert', live: 'concert', show: 'concert',
  club: 'club_gig', nightclub: 'club_gig',
  festival: 'festival', mela: 'festival',
  college: 'college_event', university: 'college_event', fest: 'college_event',
  restaurant: 'restaurant', cafe: 'restaurant', lounge: 'restaurant',
};

const GENRE_KEYWORDS = [
  'bollywood', 'sufi', 'ghazal', 'classical', 'folk', 'punjabi', 'bhangra',
  'rock', 'pop', 'jazz', 'blues', 'hip hop', 'rap', 'edm', 'electronic',
  'indie', 'fusion', 'retro', 'romantic', 'devotional', 'qawwali',
  'carnatic', 'hindustani', 'reggae', 'country', 'r&b', 'soul',
];

const VIBE_KEYWORDS = [
  'chill', 'energetic', 'high energy', 'elegant', 'romantic', 'groovy',
  'party', 'mellow', 'upbeat', 'soulful', 'peppy', 'intense',
  'acoustic', 'unplugged', 'loud', 'family friendly', 'classy',
];

const BUDGET_PATTERNS = [
  { pattern: /(\d+)\s*(?:lakh|lac|L)\b/i, multiplier: 100_000 },
  { pattern: /(\d+)\s*(?:k|K)\b/, multiplier: 1_000 },
  { pattern: /(?:₹|rs\.?|inr)\s*([\d,]+)/i, multiplier: 1 },
  { pattern: /(\d{5,})\s*(?:rupees?)?/i, multiplier: 1 },
];

const DATE_PATTERNS = [
  /(\d{4}-\d{2}-\d{2})/,
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
  /(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i,
];

const AUDIENCE_PATTERNS = [
  /(\d+)\s*(?:guests?|people|pax|log|attendees?|invitees?)/i,
  /(?:guests?|people|pax|log|attendees?|invitees?)\s*[:\-]?\s*(\d+)/i,
];

// ─── Helpers ────────────────────────────────────────────────

function jaccard(a: string[], b: string[]): number {
  if (!a?.length && !b?.length) return 0;
  if (!a?.length || !b?.length) return 0;
  const setA = new Set(a.map((s) => s.toLowerCase()));
  const setB = new Set(b.map((s) => s.toLowerCase()));
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function parsePricing(raw: unknown): Array<{ event_type?: string; min_price?: number; max_price?: number }> {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

function formatINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

// ─── Service ────────────────────────────────────────────────

export class DecisionEngineService {
  /**
   * Parse raw text into a structured brief (no persistence).
   */
  parseBrief(rawText: string): ParsedBrief {
    const lower = rawText.toLowerCase();
    let confidence = 0;
    let fieldsFound = 0;

    // Event type
    let event_type: string | null = null;
    for (const [keyword, type] of Object.entries(EVENT_TYPE_KEYWORDS)) {
      if (lower.includes(keyword)) {
        event_type = type;
        fieldsFound++;
        break;
      }
    }

    // City
    let city: string | null = null;
    for (const c of INDIAN_CITIES) {
      if (lower.includes(c)) {
        city = c.charAt(0).toUpperCase() + c.slice(1);
        fieldsFound++;
        break;
      }
    }

    // Budget
    let budget_min_paise: number | null = null;
    let budget_max_paise: number | null = null;
    for (const { pattern, multiplier } of BUDGET_PATTERNS) {
      const match = rawText.match(pattern);
      if (match) {
        const amount = Number(match[1].replace(/,/g, '')) * multiplier;
        const amountPaise = amount * 100;
        budget_min_paise = Math.round(amountPaise * 0.7);
        budget_max_paise = Math.round(amountPaise * 1.3);
        fieldsFound++;
        break;
      }
    }

    // Date
    let event_date: string | null = null;
    for (const pattern of DATE_PATTERNS) {
      const match = rawText.match(pattern);
      if (match) {
        event_date = match[0];
        fieldsFound++;
        break;
      }
    }

    // Audience size
    let audience_size: number | null = null;
    for (const pattern of AUDIENCE_PATTERNS) {
      const match = rawText.match(pattern);
      if (match) {
        audience_size = Number(match[1] || match[2]);
        fieldsFound++;
        break;
      }
    }

    // Genres
    const genres: string[] = [];
    for (const genre of GENRE_KEYWORDS) {
      if (lower.includes(genre)) genres.push(genre);
    }
    if (genres.length > 0) fieldsFound++;

    // Vibe tags
    const vibe_tags: string[] = [];
    for (const vibe of VIBE_KEYWORDS) {
      if (lower.includes(vibe)) vibe_tags.push(vibe);
    }

    // Family safe
    const is_family_safe = /family|kid|child|bachch/i.test(rawText);

    confidence = Math.min(0.2 + fieldsFound * 0.15, 0.95);

    return {
      event_type,
      city,
      event_date,
      audience_size,
      budget_min_paise,
      budget_max_paise,
      genres,
      vibe_tags,
      is_family_safe,
      confidence,
    };
  }

  /**
   * Create a brief, parse it, find candidates, score, rank, and return recommendations.
   */
  async createBriefAndRecommend(
    userId: string | null,
    input: {
      raw_text: string;
      source: string;
      event_type?: string;
      city?: string;
      event_date?: string;
      audience_size?: number;
      budget_min_paise?: number;
      budget_max_paise?: number;
      genres?: string[];
      vibe_tags?: string[];
      is_family_safe?: boolean;
      workspace_id?: string;
    },
  ) {
    // 1. Persist brief
    const brief = await decisionEngineRepository.createBrief({
      source: input.source,
      raw_text: input.raw_text,
      status: 'parsing',
      created_by_user_id: userId,
      workspace_id: input.workspace_id ?? null,
    });

    await decisionEngineRepository.insertEvent(brief.id, 'brief_created', {
      source: input.source,
      user_id: userId,
    });

    // 2. Parse raw text
    const parsed = this.parseBrief(input.raw_text);

    // Merge explicit fields (override parsed)
    if (input.event_type) parsed.event_type = input.event_type;
    if (input.city) parsed.city = input.city;
    if (input.event_date) parsed.event_date = input.event_date;
    if (input.audience_size) parsed.audience_size = input.audience_size;
    if (input.budget_min_paise) parsed.budget_min_paise = input.budget_min_paise;
    if (input.budget_max_paise) parsed.budget_max_paise = input.budget_max_paise;
    if (input.genres?.length) parsed.genres = input.genres;
    if (input.vibe_tags?.length) parsed.vibe_tags = input.vibe_tags;
    if (input.is_family_safe !== undefined) parsed.is_family_safe = input.is_family_safe;

    // 3. Update brief with parsed data
    await decisionEngineRepository.updateBrief(brief.id, {
      status: 'parsed',
      structured_brief: parsed as unknown as Record<string, unknown>,
    });

    if (parsed.confidence < 0.2) {
      await decisionEngineRepository.insertEvent(brief.id, 'brief_parse_failed', {
        confidence: parsed.confidence,
      });
    }

    // 4. Search candidates
    let candidateQuery = db('artist_profiles as ap')
      .leftJoin('users as u', 'u.id', 'ap.user_id')
      .where('u.is_active', true)
      .whereNull('ap.deleted_at')
      .select('ap.*');

    if (parsed.event_type) {
      candidateQuery = candidateQuery.whereRaw('? = ANY(ap.event_types)', [parsed.event_type]);
    }
    if (parsed.city) {
      candidateQuery = candidateQuery.where('ap.base_city', 'ilike', `%${parsed.city}%`);
    }
    if (parsed.genres.length > 0) {
      candidateQuery = candidateQuery.whereRaw(
        'ap.genres && ?::text[]',
        [`{${parsed.genres.join(',')}}`],
      );
    }

    let candidates = await candidateQuery
      .orderBy('ap.trust_score', 'desc')
      .limit(DECISION_ENGINE_MAX_CANDIDATES);

    // If too few results with strict filters, broaden
    if (candidates.length < 3 && (parsed.event_type || parsed.city)) {
      const broadQuery = db('artist_profiles as ap')
        .leftJoin('users as u', 'u.id', 'ap.user_id')
        .where('u.is_active', true)
        .whereNull('ap.deleted_at')
        .select('ap.*');

      if (parsed.city) {
        candidates = await broadQuery
          .where('ap.base_city', 'ilike', `%${parsed.city}%`)
          .orderBy('ap.trust_score', 'desc')
          .limit(DECISION_ENGINE_MAX_CANDIDATES);
      } else {
        candidates = await broadQuery
          .orderBy('ap.trust_score', 'desc')
          .limit(DECISION_ENGINE_MAX_CANDIDATES);
      }
    }

    if (candidates.length === 0) {
      await decisionEngineRepository.updateBrief(brief.id, { status: 'completed' });
      await decisionEngineRepository.insertEvent(brief.id, 'recommendation_returned', {
        count: 0,
      });
      return {
        brief_id: brief.id,
        summary: this.buildSummary(parsed),
        parsed_brief: parsed,
        recommendations: [],
        constraints_note: 'No artists match your criteria. Try broadening your requirements.',
      };
    }

    // 5. Hard filters
    const artistIds = candidates.map((c) => c.id as string);

    // Check availability if date specified
    let unavailableIds = new Set<string>();
    if (parsed.event_date) {
      const unavailable = await decisionEngineRepository.batchCheckAvailability(
        artistIds,
        parsed.event_date,
      );
      unavailableIds = new Set(unavailable.map((u) => u.artist_id as string));
    }

    // Budget hard filter
    if (parsed.budget_max_paise) {
      const budgetMax = parsed.budget_max_paise;
      candidates = candidates.filter((c) => {
        const pricing = parsePricing(c.pricing);
        if (pricing.length === 0) return true; // No pricing data — keep
        const minPrice = Math.min(...pricing.map((p) => Number(p.min_price ?? 0)).filter((p) => p > 0));
        if (minPrice === Infinity) return true;
        return minPrice <= budgetMax * 1.5; // Allow up to 50% over budget
      });
    }

    candidates = candidates.filter((c) => !unavailableIds.has(c.id as string));

    if (candidates.length === 0) {
      await decisionEngineRepository.updateBrief(brief.id, { status: 'completed' });
      await decisionEngineRepository.insertEvent(brief.id, 'recommendation_returned', { count: 0 });
      return {
        brief_id: brief.id,
        summary: this.buildSummary(parsed),
        parsed_brief: parsed,
        recommendations: [],
        constraints_note: 'All matching artists are either unavailable or over budget.',
      };
    }

    // 6. Batch enrichment
    const filteredIds = candidates.map((c) => c.id as string);

    const [vibeHistoryRows, bookingCountRows] = await Promise.all([
      decisionEngineRepository.batchGetVibeHistory(filteredIds).catch(() => []),
      decisionEngineRepository.batchGetRecentBookingCounts(filteredIds).catch(() => []),
    ]);

    // Build lookup maps
    const vibeMap = new Map<string, string[]>();
    for (const row of vibeHistoryRows) {
      const existing = vibeMap.get(row.artist_id as string) ?? [];
      const tags = Array.isArray(row.vibe_tags) ? row.vibe_tags : [];
      vibeMap.set(row.artist_id as string, [...existing, ...tags]);
    }

    const bookingCountMap = new Map<string, number>();
    for (const row of bookingCountRows) {
      bookingCountMap.set(row.artist_id as string, Number(row.booking_count ?? 0));
    }

    // 7. Score each candidate
    const scored: ScoredCandidate[] = candidates.map((artist) => {
      const artistId = artist.id as string;
      const pricing = parsePricing(artist.pricing);
      const artistEventTypes: string[] = artist.event_types ?? [];
      const trustScore = Number(artist.trust_score ?? 0);
      const totalBookings = Number(artist.total_bookings ?? 0);
      const recentBookings = bookingCountMap.get(artistId) ?? 0;
      const artistVibes = vibeMap.get(artistId) ?? [];

      // Event type fit
      const event_type_fit = parsed.event_type && artistEventTypes.includes(parsed.event_type)
        ? 1.0
        : (parsed.event_type ? 0.3 : 0.7);

      // Audience/vibe fit
      const audience_vibe_fit = parsed.vibe_tags.length > 0 && artistVibes.length > 0
        ? jaccard(parsed.vibe_tags, artistVibes)
        : 0.5;

      // Budget fit
      let budget_fit = 0.7; // default if no budget specified
      if (parsed.budget_max_paise && pricing.length > 0) {
        const relevantPricing = parsed.event_type
          ? pricing.filter((p) => p.event_type === parsed.event_type)
          : pricing;
        const pricingToUse = relevantPricing.length > 0 ? relevantPricing : pricing;
        const avgMin = pricingToUse.reduce((s, p) => s + Number(p.min_price ?? 0), 0) / pricingToUse.length;

        if (avgMin <= parsed.budget_max_paise) {
          budget_fit = 1.0;
        } else if (avgMin <= parsed.budget_max_paise * 1.2) {
          budget_fit = 0.7;
        } else if (avgMin <= parsed.budget_max_paise * 1.5) {
          budget_fit = 0.4;
        } else {
          budget_fit = 0.2;
        }
      }

      // Reliability
      const reliability = Math.min(trustScore / 5.0, 1.0);

      // Logistics (city fit)
      let logistics = 0.5;
      if (parsed.city) {
        const artistCity = (artist.base_city as string ?? '').toLowerCase();
        const briefCity = parsed.city.toLowerCase();
        if (artistCity.includes(briefCity) || briefCity.includes(artistCity)) {
          logistics = 1.0;
        } else {
          logistics = 0.3;
        }
      }

      // Momentum
      const momentum = Math.min(recentBookings / 10, 1.0);

      // Strategic (rising star)
      const strategic = (totalBookings < RISING_STAR_MAX_BOOKINGS && trustScore >= RISING_STAR_MIN_TRUST)
        ? 1.0
        : 0.3;

      const scores = { event_type_fit, audience_vibe_fit, budget_fit, reliability, logistics, momentum, strategic };

      const W = DECISION_ENGINE_WEIGHTS;
      const total =
        W.EVENT_TYPE_FIT * event_type_fit +
        W.AUDIENCE_VIBE_FIT * audience_vibe_fit +
        W.BUDGET_FIT * budget_fit +
        W.RELIABILITY * reliability +
        W.LOGISTICS * logistics +
        W.MOMENTUM * momentum +
        W.STRATEGIC * strategic;

      // Price range for this artist
      const relevantPricing = parsed.event_type
        ? pricing.filter((p) => p.event_type === parsed.event_type)
        : pricing;
      const pricingToUse = relevantPricing.length > 0 ? relevantPricing : pricing;
      const price_min_paise = pricingToUse.length > 0
        ? Math.min(...pricingToUse.map((p) => Number(p.min_price ?? 0)))
        : 0;
      const price_max_paise = pricingToUse.length > 0
        ? Math.max(...pricingToUse.map((p) => Number(p.max_price ?? 0)))
        : 0;
      const expected_close_paise = pricingToUse.length > 0
        ? Math.round((price_min_paise + price_max_paise) / 2)
        : null;

      return {
        artist,
        scores,
        total,
        why_fit: [],
        risk_flags: [],
        logistics_flags: [],
        price_min_paise,
        price_max_paise,
        expected_close_paise,
      };
    });

    // 8. Sort and take top N
    scored.sort((a, b) => b.total - a.total);
    const topCandidates = scored.slice(0, DECISION_ENGINE_TOP_N);

    // 9. Generate explainability
    for (const c of topCandidates) {
      const trustScore = Number(c.artist.trust_score ?? 0);
      const rebookRate = Number(c.artist.rebook_rate ?? 0);

      // Why fit
      if (c.scores.event_type_fit >= 0.8) {
        c.why_fit.push(`Strong ${parsed.event_type ?? 'event'} performer`);
      }
      if (c.scores.reliability >= 0.7) {
        c.why_fit.push(`Highly reliable (${trustScore.toFixed(1)}/5 trust score)`);
      }
      if (c.scores.budget_fit >= 0.8) {
        c.why_fit.push('Priced within your budget range');
      }
      if (c.scores.audience_vibe_fit >= 0.6) {
        c.why_fit.push('Great vibe match for your audience');
      }
      if (rebookRate > 0.5) {
        c.why_fit.push(`${Math.round(rebookRate * 100)}% rebook rate`);
      }
      if (c.scores.momentum >= 0.5) {
        c.why_fit.push('In-demand — actively performing');
      }
      c.why_fit = c.why_fit.slice(0, 3);

      // Risk flags
      if (c.scores.budget_fit < 0.5 && parsed.budget_max_paise) {
        c.risk_flags.push('May exceed your budget');
      }
      if (c.scores.reliability < 0.5) {
        c.risk_flags.push('Limited performance history');
      }
      c.risk_flags = c.risk_flags.slice(0, 2);

      // Logistics flags
      if (c.scores.logistics < 0.5 && parsed.city) {
        c.logistics_flags.push(`Based in different city — travel logistics needed`);
      }
    }

    // 10. Compute overall confidence
    const overallConfidence = Math.min(
      parsed.confidence * 0.5 + (topCandidates.length > 0 ? topCandidates[0].total : 0) * 0.5,
      0.99,
    );

    // 11. Persist recommendations
    const recsToInsert = topCandidates.map((c, idx) => ({
      artist_id: c.artist.id as string,
      score: Number(c.total.toFixed(3)),
      confidence: Number(overallConfidence.toFixed(2)),
      price_min_paise: c.price_min_paise,
      price_max_paise: c.price_max_paise,
      expected_close_paise: c.expected_close_paise,
      reasons: c.why_fit,
      risk_flags: c.risk_flags,
      logistics_flags: c.logistics_flags,
      score_breakdown: c.scores,
      rank: idx + 1,
    }));

    const insertedRecs = await decisionEngineRepository.insertRecommendations(brief.id, recsToInsert);

    // 12. Update brief status
    await decisionEngineRepository.updateBrief(brief.id, { status: 'completed' });
    await decisionEngineRepository.insertEvent(brief.id, 'recommendation_returned', {
      count: insertedRecs.length,
      top_score: topCandidates[0]?.total,
    });

    // 13. Format response
    const recommendations = topCandidates.map((c, idx) => {
      const rec = insertedRecs[idx];
      const genres = c.artist.genres as string[] ?? [];
      return {
        id: rec?.id ?? '',
        artist_id: c.artist.id as string,
        artist_name: c.artist.stage_name as string,
        artist_type: genres[0] ?? 'Artist',
        profile_image: (c.artist.profile_image_url as string) ?? null,
        score: Number(c.total.toFixed(3)),
        confidence: Number(overallConfidence.toFixed(2)),
        rank: idx + 1,
        price_min_paise: c.price_min_paise,
        price_max_paise: c.price_max_paise,
        expected_close_paise: c.expected_close_paise,
        why_fit: c.why_fit,
        risk_flags: c.risk_flags,
        logistics_flags: c.logistics_flags,
        score_breakdown: c.scores,
      };
    });

    let constraints_note: string | null = null;
    if (parsed.budget_max_paise && recommendations.some((r) => r.price_min_paise > parsed.budget_max_paise!)) {
      constraints_note = 'Some recommendations may exceed your stated budget. Consider these as premium options.';
    }

    return {
      brief_id: brief.id,
      summary: this.buildSummary(parsed),
      parsed_brief: parsed,
      recommendations,
      constraints_note,
    };
  }

  /**
   * Get a brief with its recommendations.
   */
  async getBrief(briefId: string) {
    const result = await decisionEngineRepository.getBriefWithRecommendations(briefId);
    if (!result) {
      throw new DecisionEngineError('BRIEF_NOT_FOUND', 'Brief not found', 404);
    }

    const recommendations = result.recommendations.map((r: Record<string, unknown>) => ({
      id: r.id,
      artist_id: r.artist_id,
      artist_name: r.artist_name ?? 'Unknown',
      artist_type: Array.isArray(r.artist_type_raw) ? (r.artist_type_raw[0] ?? 'Artist') : 'Artist',
      profile_image: r.profile_image ?? null,
      score: Number(r.score ?? 0),
      confidence: Number(r.confidence ?? 0),
      rank: Number(r.rank ?? 0),
      price_min_paise: Number(r.price_min_paise ?? 0),
      price_max_paise: Number(r.price_max_paise ?? 0),
      expected_close_paise: r.expected_close_paise ? Number(r.expected_close_paise) : null,
      why_fit: typeof r.reasons === 'string' ? JSON.parse(r.reasons) : (r.reasons ?? []),
      risk_flags: typeof r.risk_flags === 'string' ? JSON.parse(r.risk_flags) : (r.risk_flags ?? []),
      logistics_flags: typeof r.logistics_flags === 'string' ? JSON.parse(r.logistics_flags) : (r.logistics_flags ?? []),
      score_breakdown: typeof r.score_breakdown === 'string' ? JSON.parse(r.score_breakdown) : (r.score_breakdown ?? {}),
    }));

    const structured_brief = typeof result.structured_brief === 'string'
      ? JSON.parse(result.structured_brief)
      : result.structured_brief;

    return {
      brief_id: result.id,
      summary: this.buildSummary(structured_brief),
      parsed_brief: structured_brief,
      recommendations,
      constraints_note: null,
      status: result.status,
      source: result.source,
      created_at: result.created_at,
    };
  }

  /**
   * Generate a proposal PDF for selected artists from a brief.
   */
  async generateProposal(
    briefId: string,
    userId: string,
    request: { artist_ids: string[]; include_pricing?: boolean; contact_name?: string; contact_email?: string },
  ) {
    const briefData = await decisionEngineRepository.getBriefWithRecommendations(briefId);
    if (!briefData) {
      throw new DecisionEngineError('BRIEF_NOT_FOUND', 'Brief not found', 404);
    }

    // Find the user's primary workspace (needed for presentation/proposal PDF)
    const clientProfile = await db('client_profiles')
      .where({ user_id: userId })
      .select('workspace_id', 'company_name')
      .first();
    const workspaceId = clientProfile?.workspace_id as string | undefined;
    if (!workspaceId) {
      throw new DecisionEngineError(
        'WORKSPACE_REQUIRED',
        'Please create a workspace before generating proposals.',
        400,
      );
    }

    const structured_brief = typeof briefData.structured_brief === 'string'
      ? JSON.parse(briefData.structured_brief)
      : briefData.structured_brief;

    const titleParts = [
      structured_brief.city ? `${structured_brief.city}` : null,
      structured_brief.event_type ? `${structured_brief.event_type}` : null,
      'Proposal',
    ].filter(Boolean);
    const presentationTitle = titleParts.join(' — ');

    const customHeader = [
      clientProfile?.company_name ? `Prepared for ${clientProfile.company_name}` : null,
      this.buildSummary(structured_brief),
    ].filter(Boolean).join('\n');

    const presentation = await workspaceService.generatePresentation(
      workspaceId,
      userId,
      {
        title: presentationTitle,
        artist_ids: request.artist_ids,
        include_pricing: request.include_pricing ?? true,
        include_media: true,
        custom_header: customHeader || undefined,
      },
    );

    await decisionEngineRepository.insertEvent(briefId, 'proposal_generated', {
      artist_ids: request.artist_ids,
      user_id: userId,
      workspace_id: workspaceId,
      presentation_id: (presentation as any)?.id,
      presentation_slug: (presentation as any)?.slug,
    });

    return {
      brief_id: briefId,
      proposal_type: 'decision_engine',
      workspace_id: workspaceId,
      presentation_slug: (presentation as any)?.slug,
      presentation_api_url: `/v1/presentations/${(presentation as any)?.slug}`,
      pdf_api_url: `/v1/presentations/${(presentation as any)?.slug}/pdf`,
      presentation_web_url: `/presentations/${(presentation as any)?.slug}`,
      contact: {
        name: request.contact_name ?? null,
        email: request.contact_email ?? null,
      },
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Lock availability for an artist from a brief — creates a concierge-assisted booking.
   */
  async lockAvailability(
    briefId: string,
    userId: string,
    request: { artist_id: string; preferred_date?: string; notes?: string },
  ) {
    const briefData = await decisionEngineRepository.getBriefById(briefId);
    if (!briefData) {
      throw new DecisionEngineError('BRIEF_NOT_FOUND', 'Brief not found', 404);
    }

    const structured = typeof briefData.structured_brief === 'string'
      ? JSON.parse(briefData.structured_brief)
      : briefData.structured_brief;

    // Check user has a client profile; create one if not
    let clientProfile = await db('client_profiles').where({ user_id: userId }).first();
    if (!clientProfile) {
      [clientProfile] = await db('client_profiles')
        .insert({ user_id: userId, company_name: 'Individual' })
        .returning('*');
    }

    const booking = await conciergeService.createBookingOnBehalf(
      userId,
      userId,
      {
        artist_id: request.artist_id,
        event_type: structured.event_type ?? 'other',
        event_date: request.preferred_date ?? structured.event_date ?? new Date().toISOString().split('T')[0],
        event_city: structured.city ?? '',
        duration_hours: 2,
        guest_count: structured.audience_size ?? undefined,
        special_requirements: request.notes ?? undefined,
      },
    );

    await decisionEngineRepository.updateBrief(briefId, {
      selected_recommendation_id: request.artist_id,
    });

    await decisionEngineRepository.insertEvent(briefId, 'lock_requested', {
      artist_id: request.artist_id,
      booking_id: booking.id,
      user_id: userId,
    });

    return {
      booking_id: booking.id,
      status: 'concierge_handoff',
      message: 'A booking specialist will take this forward. We\'re checking availability and pricing.',
    };
  }

  // ─── Private helpers ──────────────────────────────────────

  private buildSummary(parsed: ParsedBrief | Record<string, unknown>): string {
    const parts: string[] = [];
    if (parsed.event_type) parts.push(`${parsed.event_type} event`);
    if (parsed.city) parts.push(`in ${parsed.city}`);
    if (parsed.audience_size) parts.push(`for ${parsed.audience_size} guests`);
    if (parsed.budget_max_paise) {
      parts.push(`budget up to ${formatINR(parsed.budget_max_paise as number)}`);
    }
    if (Array.isArray(parsed.genres) && parsed.genres.length > 0) {
      parts.push(`looking for ${(parsed.genres as string[]).join(', ')}`);
    }
    return parts.length > 0
      ? parts.join(' ').replace(/^./, (c) => c.toUpperCase())
      : 'Entertainment brief';
  }
}

// ─── Error Class ────────────────────────────────────────────

export class DecisionEngineError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'DecisionEngineError';
  }
}

export const decisionEngineService = new DecisionEngineService();
