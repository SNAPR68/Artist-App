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
