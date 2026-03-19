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

// ─── Venue ──────────────────────────────────────────────────
export enum VenueStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_VERIFICATION = 'pending_verification',
}

// ─── Rider ──────────────────────────────────────────────────
export enum RiderItemCategory {
  SOUND = 'sound',
  LIGHTING = 'lighting',
  BACKLINE = 'backline',
  STAGING = 'staging',
  POWER = 'power',
  HOSPITALITY = 'hospitality',
  TRANSPORT = 'transport',
  OTHER = 'other',
}

export enum RiderPriority {
  MUST_HAVE = 'must_have',
  NICE_TO_HAVE = 'nice_to_have',
  FLEXIBLE = 'flexible',
}

export enum RiderFulfillmentStatus {
  NOT_CHECKED = 'not_checked',
  AVAILABLE = 'available',
  PARTIAL = 'partial',
  UNAVAILABLE = 'unavailable',
  ALTERNATIVE_OFFERED = 'alternative_offered',
}

// ─── Event Context ──────────────────────────────────────────
export enum CrowdEnergyLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  ELECTRIC = 'electric',
}

export enum DemographicAgeGroup {
  UNDER_18 = 'under_18',
  AGE_18_25 = '18_25',
  AGE_25_35 = '25_35',
  AGE_35_50 = '35_50',
  AGE_50_PLUS = '50_plus',
  MIXED = 'mixed',
}

// ─── WhatsApp ───────────────────────────────────────────────
export enum WhatsAppMessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum WhatsAppIntentType {
  SEARCH_ARTIST = 'search_artist',
  CHECK_AVAILABILITY = 'check_availability',
  CREATE_INQUIRY = 'create_inquiry',
  GET_QUOTE = 'get_quote',
  CHECK_STATUS = 'check_status',
  GENERAL_QUESTION = 'general_question',
  UNKNOWN = 'unknown',
}

// ─── Pricing Intelligence ───────────────────────────────────
export enum PricingTier {
  BUDGET = 'budget',
  MID_RANGE = 'mid_range',
  PREMIUM = 'premium',
  LUXURY = 'luxury',
}

export enum DemandLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  PEAK = 'peak',
}

// ─── Workspace ──────────────────────────────────────────────
export enum WorkspaceRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  COORDINATOR = 'coordinator',
}

export enum WorkspaceEventStatus {
  PLANNING = 'planning',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// ─── Voice Query ───────────────────────────────────────────
export enum VoiceIntentType {
  DISCOVER = 'discover',
  STATUS = 'status',
  ACTION = 'action',
  INTELLIGENCE = 'intelligence',
  EMERGENCY = 'emergency',
}

// ─── Emergency Substitution ────────────────────────────────
export enum SubstitutionRequestStatus {
  PENDING = 'pending',
  MATCHING = 'matching',
  NOTIFIED = 'notified',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
}

export enum SubstitutionUrgencyLevel {
  CRITICAL = 'critical',
  URGENT = 'urgent',
  STANDARD = 'standard',
}

// ─── Seasonal Demand ───────────────────────────────────────
export enum SeasonalAlertType {
  PEAK_APPROACHING = 'peak_approaching',
  VALLEY_APPROACHING = 'valley_approaching',
  BOOKING_WINDOW_CLOSING = 'booking_window_closing',
  PRICE_OPPORTUNITY = 'price_opportunity',
}

// ─── Reputation Defense ────────────────────────────────────
export enum ReviewDisputeStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  UPHELD = 'upheld',
  OVERTURNED = 'overturned',
  DISMISSED = 'dismissed',
}

// ─── Financial Command Center ──────────────────────────────
export enum FinancialPeriod {
  THIS_WEEK = 'this_week',
  NEXT_WEEK = 'next_week',
  THIS_MONTH = 'this_month',
  NEXT_3_MONTHS = 'next_3_months',
}

export enum IncomeCertificateStatus {
  GENERATING = 'generating',
  READY = 'ready',
  EXPIRED = 'expired',
}

// ─── Gig Marketplace ──────────────────────────────────────
export enum GigPostStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum GigApplicationStatus {
  PENDING = 'pending',
  SHORTLISTED = 'shortlisted',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

// ─── Gamification ──────────────────────────────────────────
export enum GamificationLevel {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

export enum BadgeType {
  VERIFIED_ARTIST = 'verified_artist',
  TOP_PERFORMER = 'top_performer',
  RISING_STAR = 'rising_star',
  RELIABLE_BACKUP = 'reliable_backup',
  EARLY_BIRD = 'early_bird',
  CROWD_FAVORITE = 'crowd_favorite',
}

export enum PointAction {
  PROFILE_COMPLETE = 'profile_complete',
  FIRST_BOOKING = 'first_booking',
  REVIEW_LEFT = 'review_left',
  ON_TIME_PERFORMANCE = 'on_time_performance',
  FIVE_STAR_REVIEW = 'five_star_review',
  GIG_APPLICATION = 'gig_application',
  STREAK_7_DAYS = 'streak_7_days',
}
