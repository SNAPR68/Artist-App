export enum UserRole {
  ARTIST = 'artist',
  AGENT = 'agent',
  CLIENT = 'client',
  EVENT_COMPANY = 'event_company',
  ADMIN = 'admin',
}

export enum BookingState {
  INQUIRY = 'inquiry',
  SHORTLISTED = 'shortlisted',
  QUOTED = 'quoted',
  NEGOTIATING = 'negotiating',
  CONFIRMED = 'confirmed',
  PRE_EVENT = 'pre_event',
  EVENT_DAY = 'event_day',
  COMPLETED = 'completed',
  SETTLED = 'settled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  DISPUTED = 'disputed',
}

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  IN_ESCROW = 'in_escrow',
  SETTLED = 'settled',
  REFUND_INITIATED = 'refund_initiated',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  FAILED = 'failed',
}

export enum MediaType {
  VIDEO = 'video',
  IMAGE = 'image',
  AUDIO = 'audio',
}

export enum TranscodeStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum CalendarStatus {
  AVAILABLE = 'available',
  HELD = 'held',
  BOOKED = 'booked',
  BLOCKED = 'blocked',
}

export enum EventType {
  WEDDING = 'wedding',
  CORPORATE = 'corporate',
  PRIVATE_PARTY = 'private_party',
  CONCERT = 'concert',
  CLUB_GIG = 'club_gig',
  FESTIVAL = 'festival',
  COLLEGE_EVENT = 'college_event',
  RESTAURANT = 'restaurant',
  OTHER = 'other',
}

export enum NotificationChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  PUSH = 'push',
  EMAIL = 'email',
}

export enum CityTier {
  TIER_1 = 'tier_1',
  TIER_2 = 'tier_2',
  TIER_3 = 'tier_3',
}

// ─── Dispute ──────────────────────────────────────────────────
export enum DisputeType {
  PARTIAL_PERFORMANCE = 'partial_performance',
  NO_SHOW = 'no_show',
  EQUIPMENT_FAILURE = 'equipment_failure',
  QUALITY_COMPLAINT = 'quality_complaint',
  PAYMENT_DISPUTE = 'payment_dispute',
  FORCE_MAJEURE = 'force_majeure',
}

export enum DisputeStatus {
  SUBMITTED = 'submitted',
  EVIDENCE_COLLECTION = 'evidence_collection',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  APPEALED = 'appealed',
  CLOSED = 'closed',
}

export enum ResolutionType {
  FULL_REFUND = 'full_refund',
  PARTIAL_REFUND = 'partial_refund',
  NO_REFUND = 'no_refund',
  REBOOKING = 'rebooking',
  MEDIATED_AGREEMENT = 'mediated_agreement',
}

// ─── Cancellation ─────────────────────────────────────────────
export enum CancellationSubType {
  BY_CLIENT = 'by_client',
  BY_ARTIST = 'by_artist',
  FORCE_MAJEURE = 'force_majeure',
  BY_PLATFORM = 'by_platform',
}

// ─── Payout ───────────────────────────────────────────────────
export enum PayoutStatus {
  PENDING = 'pending',
  INITIATED = 'initiated',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum TransferMethod {
  BANK_TRANSFER = 'bank_transfer',
  UPI = 'upi',
  MANUAL = 'manual',
}

// ─── Coordination ────────────────────────────────────────────
export enum CoordinationCheckpoint {
  RIDER_CONFIRMED = 'rider_confirmed',
  LOGISTICS_CONFIRMED = 'logistics_confirmed',
  FINAL_CONFIRMED = 'final_confirmed',
  BRIEFING_SENT = 'briefing_sent',
}

// ─── Event Day ───────────────────────────────────────────────
export enum EventDayIssueType {
  SOUND_ISSUES = 'sound_issues',
  LATE_START = 'late_start',
  VENUE_NOT_READY = 'venue_not_ready',
  EQUIPMENT_FAILURE = 'equipment_failure',
  ARTIST_LATE = 'artist_late',
  OTHER = 'other',
}

// ─── Failure Tracking ────────────────────────────────────────
export enum FailureEventType {
  EMPTY_SEARCH = 'empty_search',
  REJECTED_QUOTE = 'rejected_quote',
  ABANDONED_FLOW = 'abandoned_flow',
  BOOKING_DROPOFF = 'booking_dropoff',
}
