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
  VenueStatus,
  RiderItemCategory,
  RiderPriority,
  RiderFulfillmentStatus,
  CrowdEnergyLevel,
  DemographicAgeGroup,
  WhatsAppIntentType,
  WhatsAppMessageDirection,
  PricingTier,
  DemandLevel,
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

// ─── Venue Profile ────────────────────────────────────────────
export interface VenueProfile extends BaseEntity {
  name: string;
  slug: string;
  venue_type: string;
  status: VenueStatus;
  city: string;
  city_tier: CityTier;
  address: string;
  lat: number | null;
  lng: number | null;
  capacity_min: number;
  capacity_max: number;
  indoor: boolean;
  outdoor_covered: boolean;
  outdoor_open: boolean;
  stage_width_ft: number | null;
  stage_depth_ft: number | null;
  ceiling_height_ft: number | null;
  power_supply_kva: number | null;
  has_green_room: boolean;
  has_parking: boolean;
  parking_capacity: number | null;
  load_in_access: string | null;
  acoustics_rating: number | null;
  photos: string[];
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  created_by: string | null;
  total_events_hosted: number;
  avg_crowd_rating: number | null;
}

export interface VenueEquipment {
  id: string;
  venue_id: string;
  category: RiderItemCategory;
  item_name: string;
  quantity: number;
  condition: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Artist Rider ─────────────────────────────────────────────
export interface ArtistRider {
  id: string;
  artist_id: string;
  version: number;
  notes: string | null;
  hospitality_requirements: Record<string, unknown>;
  travel_requirements: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RiderLineItem {
  id: string;
  rider_id: string;
  category: RiderItemCategory;
  item_name: string;
  quantity: number;
  priority: RiderPriority;
  specifications: string | null;
  alternatives: string[];
  sort_order: number;
  created_at: string;
}

export interface RiderVenueCheck {
  id: string;
  booking_id: string;
  rider_id: string;
  venue_id: string;
  line_item_id: string;
  fulfillment_status: RiderFulfillmentStatus;
  alternative_offered: string | null;
  checked_by: string | null;
  checked_at: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Event Context ────────────────────────────────────────────
export interface EventContextData {
  id: string;
  booking_id: string;
  submitted_by: string;
  crowd_size_estimate: number;
  crowd_energy: CrowdEnergyLevel;
  primary_age_group: DemographicAgeGroup;
  secondary_age_group: DemographicAgeGroup | null;
  gender_ratio_male_pct: number;
  vibe_tags: string[];
  genre_reception: Record<string, number>;
  set_highlights: string | null;
  would_rebook_artist: boolean;
  venue_acoustics_rating: number | null;
  venue_crowd_flow_rating: number | null;
  audience_requests: string[];
  weather_conditions: string | null;
  created_at: string;
}

// ─── Calendar Intelligence ────────────────────────────────────
export interface DemandForecast {
  id: string;
  signal_date: string;
  city: string;
  genre: string | null;
  event_type: EventType | null;
  search_count: number;
  inquiry_count: number;
  booking_count: number;
  available_artist_count: number;
  fill_rate: number;
  demand_level: DemandLevel;
  yoy_growth_pct: number | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarIntelligenceAlert {
  id: string;
  artist_id: string;
  alert_type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  is_actionable: boolean;
  action_url: string | null;
  expires_at: string | null;
  created_at: string;
}

// ─── WhatsApp ─────────────────────────────────────────────────
export interface WhatsAppConversation {
  id: string;
  phone_number: string;
  user_id: string | null;
  current_intent: WhatsAppIntentType | null;
  conversation_state: Record<string, unknown>;
  last_message_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  direction: WhatsAppMessageDirection;
  message_type: string;
  content: string;
  parsed_intent: WhatsAppIntentType | null;
  parsed_entities: Record<string, unknown> | null;
  provider_message_id: string | null;
  status: string;
  created_at: string;
}

// ─── Pricing Brain ────────────────────────────────────────────
export interface ArtistMarketPosition {
  id: string;
  artist_id: string;
  genre: string;
  city: string;
  event_type: EventType;
  pricing_tier: PricingTier;
  percentile_rank: number;
  market_median_paise: number;
  artist_avg_paise: number;
  price_vs_market_pct: number;
  sample_size: number;
  market_sample_size: number;
  last_computed_at: string;
  created_at: string;
  updated_at: string;
}

export interface PricingRecommendation {
  id: string;
  artist_id: string;
  event_type: EventType;
  city: string | null;
  recommended_min_paise: number;
  recommended_max_paise: number;
  current_min_paise: number;
  current_max_paise: number;
  rationale: string;
  factors: Record<string, unknown>;
  confidence: number;
  is_dismissed: boolean;
  created_at: string;
  expires_at: string;
}

// ─── Venue-Artist History ─────────────────────────────────────
export interface VenueArtistHistory {
  id: string;
  venue_id: string;
  artist_id: string;
  booking_id: string;
  event_type: EventType;
  event_date: string;
  crowd_energy: CrowdEnergyLevel | null;
  venue_acoustics_rating: number | null;
  overall_review_rating: number | null;
  created_at: string;
}
