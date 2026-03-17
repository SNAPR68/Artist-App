import type {
  UserRole,
  BookingState,
  PaymentStatus,
  MediaType,
  TranscodeStatus,
  CalendarStatus,
  EventType,
  CityTier,
  DisputeType,
  DisputeStatus,
  ResolutionType,
  CancellationSubType,
  PayoutStatus,
  TransferMethod,
  EventDayIssueType,
  FailureEventType,
} from '../enums/index.js';

// ─── Base Types ──────────────────────────────────────────────
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── User ────────────────────────────────────────────────────
export interface User extends BaseEntity {
  phone: string;
  email: string | null;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
}

// ─── Artist Profile ──────────────────────────────────────────
export interface ArtistProfile extends BaseEntity {
  user_id: string;
  stage_name: string;
  bio: string | null;
  genres: string[];
  languages: string[];
  base_city: string;
  travel_radius_km: number;
  event_types: EventType[];
  performance_duration_min: number;
  performance_duration_max: number;
  pricing: PricingMatrix[];
  trust_score: number;
  total_bookings: number;
  acceptance_rate: number;
  avg_response_time_hours: number;
  is_verified: boolean;
  profile_completion_pct: number;
  location: { lat: number; lng: number } | null;
}

export interface PricingMatrix {
  event_type: EventType;
  city_tier: CityTier;
  min_price: number; // in paise
  max_price: number; // in paise
  travel_surcharge: number | null; // flat fee in paise, or null
}

// ─── Agent Profile ───────────────────────────────────────────
export interface AgentProfile extends BaseEntity {
  user_id: string;
  company_name: string | null;
  commission_rate: number; // percentage, e.g. 10.0
  total_artists: number;
  total_bookings: number;
}

// ─── Client Profile ──────────────────────────────────────────
export interface ClientProfile extends BaseEntity {
  user_id: string;
  client_type: 'corporate' | 'wedding_planner' | 'club_venue' | 'individual' | 'event_company';
  company_name: string | null;
  total_bookings: number;
}

// ─── Availability Calendar ───────────────────────────────────
export interface CalendarEntry {
  id: string;
  artist_id: string;
  date: string; // YYYY-MM-DD
  status: CalendarStatus;
  booking_id: string | null;
  inquiry_id: string | null;
  hold_expires_at: string | null;
}

// ─── Booking ─────────────────────────────────────────────────
export interface Booking extends BaseEntity {
  client_id: string;
  artist_id: string;
  agent_id: string | null;
  event_type: EventType;
  event_date: string; // YYYY-MM-DD
  event_city: string;
  event_venue: string | null;
  duration_hours: number;
  requirements: string | null;
  state: BookingState;
  agreed_amount: number | null; // paise
  platform_fee: number | null; // paise
  contract_url: string | null;
  contract_hash: string | null;
}

// ─── Booking Quote ───────────────────────────────────────────
export interface BookingQuote extends BaseEntity {
  booking_id: string;
  quoted_by: string; // user_id
  round_number: number; // 1, 2, 3
  base_amount: number; // paise
  travel_surcharge: number; // paise
  platform_fee: number; // paise
  total_amount: number; // paise
  breakdown: QuoteBreakdown;
  is_final: boolean;
  notes: string | null;
}

export interface QuoteBreakdown {
  base_rate: number;
  travel_surcharge: number;
  platform_fee: number;
  gst_on_platform_fee: number;
  total: number;
}

// ─── Payment ─────────────────────────────────────────────────
export interface Payment extends BaseEntity {
  booking_id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount: number; // paise
  currency: string;
  status: PaymentStatus;
  payment_method: string | null;
  artist_share: number; // paise
  platform_fee: number; // paise
  agent_commission: number; // paise
  tds_amount: number; // paise
  gst_amount: number; // paise
  refund_amount: number | null; // paise
  settled_at: string | null;
}

// ─── Review ──────────────────────────────────────────────────
export interface Review extends BaseEntity {
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  overall_rating: number; // 1-5
  dimensions: ReviewDimensions;
  comment: string | null;
  is_published: boolean;
  publish_at: string; // 48h after creation
}

export interface ReviewDimensions {
  // Client reviewing artist
  performance_quality?: number;
  professionalism?: number;
  punctuality?: number;
  communication?: number;
  // Artist reviewing client
  event_organization?: number;
  payment_timeliness?: number;
  respectfulness?: number;
}

// ─── Media ───────────────────────────────────────────────────
export interface MediaItem extends BaseEntity {
  artist_id: string;
  type: MediaType;
  original_url: string;
  cdn_url: string | null;
  thumbnail_url: string | null;
  preview_url: string | null;
  transcode_status: TranscodeStatus;
  title: string | null;
  tags: string[];
  sort_order: number;
  file_size_bytes: number;
}

// ─── Booking Event (Audit Log) ───────────────────────────────
export interface BookingEvent {
  id: string;
  booking_id: string;
  event_type: string;
  from_state: BookingState | null;
  to_state: BookingState;
  triggered_by: string; // user_id or 'system'
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── API Response Envelope ───────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  errors: ApiError[];
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

// ─── Search ──────────────────────────────────────────────────
export interface SearchFilters {
  q?: string;
  genre?: string[];
  city?: string;
  event_type?: EventType;
  date?: string;
  budget_min?: number;
  budget_max?: number;
  distance_km?: number;
  lat?: number;
  lng?: number;
  sort_by?: 'relevance' | 'trust_score' | 'price_low' | 'price_high' | 'distance';
  page?: number;
  per_page?: number;
}

export interface SearchFacets {
  genres: { key: string; count: number }[];
  cities: { key: string; count: number }[];
  price_ranges: { key: string; count: number }[];
}

// ─── Dispute ────────────────────────────────────────────────────
export interface Dispute extends BaseEntity {
  booking_id: string;
  dispute_type: DisputeType;
  status: DisputeStatus;
  initiated_by: string;
  description: string;
  resolution_type: ResolutionType | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  financial_resolution: Record<string, unknown> | null;
  trust_impact: Record<string, unknown> | null;
  evidence_deadline: string | null;
}

export interface DisputeEvidence {
  id: string;
  dispute_id: string;
  submitted_by: string;
  evidence_type: string;
  file_url: string;
  description: string | null;
  created_at: string;
}

// ─── Cancellation ───────────────────────────────────────────────
export interface CancellationDetail {
  id: string;
  booking_id: string;
  sub_type: CancellationSubType;
  initiated_by: string;
  reason: string;
  backup_artist_triggered: boolean;
  refund_amount_paise: number;
  artist_amount_paise: number;
  trust_impact: Record<string, unknown> | null;
  created_at: string;
}

// ─── Bank Account ───────────────────────────────────────────────
export interface ArtistBankAccount extends BaseEntity {
  artist_id: string;
  account_holder_name: string;
  account_number_encrypted: string;
  ifsc_code: string;
  bank_name: string;
  upi_id_encrypted: string | null;
  is_verified: boolean;
  is_primary: boolean;
}

// ─── Payout ─────────────────────────────────────────────────────
export interface PayoutTransfer {
  id: string;
  settlement_id: string;
  artist_id: string;
  amount_paise: number;
  transfer_method: TransferMethod;
  transfer_reference: string | null;
  status: PayoutStatus;
  initiated_at: string | null;
  completed_at: string | null;
  failed_reason: string | null;
  retry_count: number;
  created_at: string;
}

// ─── Coordination ──────────────────────────────────────────────
export interface CoordinationChecklist {
  id: string;
  booking_id: string;
  rider_confirmed: boolean;
  rider_confirmed_at: string | null;
  logistics_confirmed: boolean;
  logistics_confirmed_at: string | null;
  final_confirmed: boolean;
  final_confirmed_at: string | null;
  briefing_sent: boolean;
  briefing_sent_at: string | null;
  travel_mode: string | null;
  hotel_booked: boolean;
  hotel_details: { name: string; address: string; check_in: string; confirmation_id?: string } | null;
  parking_arranged: boolean;
  special_rider_notes: string | null;
  escalation_level: number;
  created_at: string;
  updated_at: string;
}

// ─── Event Day ─────────────────────────────────────────────────
export interface EventDayLog {
  id: string;
  booking_id: string;
  arrival_lat: number | null;
  arrival_lng: number | null;
  arrival_verified: boolean;
  arrival_distance_m: number | null;
  arrival_at: string | null;
  soundcheck_artist: boolean;
  soundcheck_artist_at: string | null;
  soundcheck_client: boolean;
  soundcheck_client_at: string | null;
  set_start_at: string | null;
  set_end_at: string | null;
  actual_duration_min: number | null;
  completion_artist: boolean;
  completion_artist_at: string | null;
  completion_client: boolean;
  completion_client_at: string | null;
  issues: EventDayIssue[];
  created_at: string;
  updated_at: string;
}

export interface EventDayIssue {
  type: EventDayIssueType;
  description: string;
  reported_by: string;
  reported_at: string;
}

// ─── Failure Event ─────────────────────────────────────────────
export interface FailureEvent {
  id: string;
  event_type: FailureEventType;
  user_id: string | null;
  session_id: string | null;
  search_params: Record<string, unknown> | null;
  booking_id: string | null;
  stage: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
