import type {
  UserRole,
  BookingState,
  PaymentStatus,
  MediaType,
  TranscodeStatus,
  CalendarStatus,
  EventType,
  CityTier,
} from '../enums/index';

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
