import { BookingState, DisputeStatus } from '../enums/index.js';

// ─── Booking State Transitions ───────────────────────────────
// Maps each state to its allowed next states
export const BOOKING_STATE_TRANSITIONS: Record<BookingState, BookingState[]> = {
  [BookingState.INQUIRY]: [BookingState.SHORTLISTED, BookingState.QUOTED, BookingState.CANCELLED, BookingState.EXPIRED],
  [BookingState.SHORTLISTED]: [BookingState.QUOTED, BookingState.CANCELLED, BookingState.EXPIRED],
  [BookingState.QUOTED]: [BookingState.NEGOTIATING, BookingState.CONFIRMED, BookingState.CANCELLED, BookingState.EXPIRED],
  [BookingState.NEGOTIATING]: [BookingState.CONFIRMED, BookingState.CANCELLED, BookingState.EXPIRED],
  [BookingState.CONFIRMED]: [BookingState.PRE_EVENT, BookingState.CANCELLED, BookingState.DISPUTED],
  [BookingState.PRE_EVENT]: [BookingState.EVENT_DAY, BookingState.CANCELLED, BookingState.DISPUTED],
  [BookingState.EVENT_DAY]: [BookingState.COMPLETED, BookingState.DISPUTED],
  [BookingState.COMPLETED]: [BookingState.SETTLED, BookingState.DISPUTED],
  [BookingState.SETTLED]: [],
  [BookingState.CANCELLED]: [],
  [BookingState.EXPIRED]: [],
  [BookingState.DISPUTED]: [BookingState.SETTLED, BookingState.CANCELLED],
};

// ─── Cancellation Tiers ──────────────────────────────────────
export const CANCELLATION_TIERS = [
  { minDaysBefore: 30, refundPercent: 100, artistPercent: 0 },
  { minDaysBefore: 15, refundPercent: 75, artistPercent: 25 },
  { minDaysBefore: 7, refundPercent: 50, artistPercent: 50 },
  { minDaysBefore: 0, refundPercent: 0, artistPercent: 100 },
] as const;

// ─── Negotiation ─────────────────────────────────────────────
export const MAX_NEGOTIATION_ROUNDS = 3;

// ─── Hold Expiry ─────────────────────────────────────────────
export const HOLD_EXPIRY_HOURS = 48;

// ─── Rate Limits ─────────────────────────────────────────────
export const RATE_LIMITS = {
  READ: { max: 100, windowMs: 60_000 },
  WRITE: { max: 30, windowMs: 60_000 },
  SEARCH: { max: 60, windowMs: 60_000 },
  OTP_GENERATE: { max: 5, windowMs: 900_000 }, // 5 per 15 minutes
  OTP_VERIFY: { max: 5, windowMs: 300_000 }, // 5 per 5 minutes
  INSTABOOK_INTEREST: { max: 5, windowMs: 3_600_000 }, // 5 per hour per IP
} as const;

// ─── Pagination ──────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE: 100,
} as const;

// ─── Cache TTLs (seconds) ────────────────────────────────────
export const CACHE_TTL = {
  ARTIST_AVAILABILITY: 300, // 5 minutes
  SEARCH_RESULTS: 120, // 2 minutes
  USER_SESSION: 86_400, // 24 hours
  OTP: 300, // 5 minutes
} as const;

// ─── Financial ───────────────────────────────────────────────
export const FINANCIAL = {
  TDS_RATE: 0.10, // 10% Section 194J
  GST_RATE: 0.18, // 18% on platform fee
  PLATFORM_FEE_RATE: 0.10, // 10% default platform fee
  MIN_TDS_SINGLE_TXN: 3_000_000, // 30,000 INR in paise
  MIN_TDS_ANNUAL_AGGREGATE: 10_000_000, // 1,00,000 INR in paise
  CURRENCY: 'INR',
} as const;

// ─── Trust Score Weights (70% Behavioral / 30% Stated) ──────
export const TRUST_SCORE_WEIGHTS = {
  BEHAVIORAL_WEIGHT: 0.70,
  STATED_WEIGHT: 0.30,
  // Behavioral components (sum to 1.0)
  COMPLETION_RATE: 0.25,
  PUNCTUALITY: 0.20,
  RESPONSE_TIME: 0.10,
  REBOOKING_RATE: 0.10,
  CANCELLATION_RATE: 0.15,
  CONTRACT_COMPLIANCE: 0.20,
  // Stated components (sum to 1.0)
  AVG_RATING: 0.60,
  WOULD_REBOOK: 0.25,
  DIMENSIONAL_VARIANCE: 0.15,
} as const;

// ─── Review ──────────────────────────────────────────────────
export const REVIEW_HOLD_HOURS = 48;

// ─── Dispute ────────────────────────────────────────────────────
export const DISPUTE_EVIDENCE_WINDOW_HOURS = 48;
export const DISPUTE_REVIEW_SLA_HOURS = 72;
export const DISPUTE_APPEAL_WINDOW_DAYS = 7;

export const DISPUTE_STATUS_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  [DisputeStatus.SUBMITTED]: [DisputeStatus.EVIDENCE_COLLECTION, DisputeStatus.UNDER_REVIEW],
  [DisputeStatus.EVIDENCE_COLLECTION]: [DisputeStatus.UNDER_REVIEW],
  [DisputeStatus.UNDER_REVIEW]: [DisputeStatus.RESOLVED],
  [DisputeStatus.RESOLVED]: [DisputeStatus.APPEALED, DisputeStatus.CLOSED],
  [DisputeStatus.APPEALED]: [DisputeStatus.UNDER_REVIEW, DisputeStatus.CLOSED],
  [DisputeStatus.CLOSED]: [],
};

// ─── Cancellation ───────────────────────────────────────────────
export const CANCELLATION_TRUST_PENALTY_THRESHOLD_DAYS = 7;
export const CANCELLATION_TRUST_PENALTY_POINTS = -5;

// ─── Payout ─────────────────────────────────────────────────────
export const PAYOUT_MAX_RETRY_COUNT = 3;

// ─── Coordination ──────────────────────────────────────────────
export const COORDINATION_CHECKPOINTS = {
  RIDER_CONFIRM_DAYS_BEFORE: 14,
  LOGISTICS_CONFIRM_DAYS_BEFORE: 7,
  FINAL_CONFIRM_DAYS_BEFORE: 3,
  BRIEFING_DAYS_BEFORE: 1,
} as const;

export const COORDINATION_ESCALATION_THRESHOLDS = {
  RIDER_ESCALATE_DAYS_BEFORE: 5,
  LOGISTICS_ESCALATE_DAYS_BEFORE: 4,
  FINAL_ESCALATE_DAYS_BEFORE: 2,
} as const;

// ─── Event Day ─────────────────────────────────────────────────
export const ARRIVAL_VERIFICATION_RADIUS_M = 500;

// ─── Venue-Artist Compatibility ─────────────────────────────────
export const VENUE_COMPATIBILITY_WEIGHTS = {
  CAPACITY: 0.30,
  EQUIPMENT: 0.35,
  LOCATION: 0.15,
  PAST_SUCCESS: 0.20,
} as const;

// ─── Demand Intelligence ────────────────────────────────────────
export const DEMAND_THRESHOLDS = {
  LOW: 0.3,
  MODERATE: 0.5,
  HIGH: 0.7,
  PEAK: 0.9,
} as const;

export const PRICING_TIER_PERCENTILES = {
  BUDGET: { min: 0, max: 25 },
  MID_RANGE: { min: 25, max: 50 },
  PREMIUM: { min: 50, max: 75 },
  LUXURY: { min: 75, max: 100 },
} as const;

export const CALENDAR_INTELLIGENCE_LOOKAHEAD_DAYS = 90;

// ─── WhatsApp ───────────────────────────────────────────────────
export const WHATSAPP_SESSION_TIMEOUT_HOURS = 24;

// ─── Recommendation Engine ──────────────────────────────────────
export const RECOMMENDATION_WEIGHTS = {
  SIMILAR_ARTIST: { GENRE: 0.30, PRICE_FIT: 0.25, EVENT_TYPE: 0.20, VIBE: 0.15, CITY: 0.10 },
  POPULAR_FOR_EVENT: { TRUST: 0.30, BOOKING_COUNT: 0.25, AVG_REVIEW: 0.20, PRICE_FIT: 0.15, REBOOK: 0.10 },
  EVENTS_FOR_ARTIST: { DEMAND: 0.30, GENRE_MATCH: 0.25, CROWD_HISTORY: 0.20, VENUE_COMPAT: 0.15, PRICE: 0.10 },
} as const;

export const RECOMMENDATION_EXPIRY_DAYS = 7;
export const RISING_STAR_MAX_BOOKINGS = 20;
export const RISING_STAR_MIN_TRUST = 3.5;

// ─── Dynamic Pricing ────────────────────────────────────────────
export const DYNAMIC_PRICING_MAX_SURGE_PCT = 50;
export const DYNAMIC_PRICE_LOOKAHEAD_DAYS = 30;

// ─── Voice Query ───────────────────────────────────────────────
export const VOICE_QUERY_CONFIDENCE_THRESHOLD = 0.4;
export const VOICE_SESSION_TIMEOUT_MINUTES = 30;

// ─── Emergency Substitution ───────────────────────────────────
export const SUBSTITUTION_WEIGHTS = {
  GENRE_OVERLAP: 0.30,
  TIER_PROXIMITY: 0.25,
  VENUE_FIT: 0.20,
  GEOGRAPHIC: 0.15,
  HISTORICAL_SUCCESS: 0.10,
} as const;
export const SUBSTITUTION_MAX_CANDIDATES = 5;
export const SUBSTITUTION_PREMIUM_MULTIPLIER = 1.25;
export const SUBSTITUTION_EXPIRY_HOURS = {
  CRITICAL: 4,
  URGENT: 24,
  STANDARD: 72,
} as const;
export const SUBSTITUTION_SEARCH_RADIUS_KM = 500;

// ─── Seasonal Demand Intelligence ─────────────────────────────
export const SEASONAL_DEMAND_LOOKBACK_MONTHS = 24;
export const SEASONAL_DEMAND_LOOKAHEAD_MONTHS = 3;
export const SEASONAL_PEAK_THRESHOLD = 0.8;
export const SEASONAL_VALLEY_THRESHOLD = 0.3;

// ─── Reputation Defense ───────────────────────────────────────
export const VENUE_ISSUE_REVIEW_WEIGHT_REDUCTION = 0.40;
export const VENUE_ISSUE_FLAG_THRESHOLD = 2;

// ─── Financial Command Center ─────────────────────────────────
export const FINANCIAL_FORECAST_WEEKS_AHEAD = 12;
export const INCOME_CERTIFICATE_VALID_DAYS = 30;
export const LIGHT_MONTH_THRESHOLD_PCT = 50;

// ─── Gig Advisor v2 ──────────────────────────────────────────
export const GIG_TRAVEL_COST_TIERS_PAISE = {
  SAME_CITY: 0,
  UNDER_200KM: 500000,
  UNDER_500KM: 1500000,
  OVER_500KM: 2500000,
} as const;
export const GIG_ADVISOR_MAX_CONCURRENT = 5;

// ─── Decision Engine ────────────────────────────────────────────
export const DECISION_ENGINE_WEIGHTS = {
  EVENT_TYPE_FIT: 0.25,
  AUDIENCE_VIBE_FIT: 0.20,
  BUDGET_FIT: 0.20,
  RELIABILITY: 0.15,
  LOGISTICS: 0.10,
  MOMENTUM: 0.05,
  STRATEGIC: 0.05,
} as const;

export const DECISION_ENGINE_MAX_CANDIDATES = 200;
export const DECISION_ENGINE_TOP_N = 5;
export const DECISION_ENGINE_MIN_CONFIDENCE = 0.3;
