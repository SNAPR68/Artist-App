import { z } from 'zod';
import {
  UserRole, EventType, CityTier, CalendarStatus, MediaType,
  DisputeType, ResolutionType, CancellationSubType,
  CoordinationCheckpoint, EventDayIssueType,
  RiderItemCategory, RiderPriority, RiderFulfillmentStatus,
  CrowdEnergyLevel, DemographicAgeGroup,
  WorkspaceRole, WorkspaceEventStatus,
  SubstitutionUrgencyLevel,
  FinancialPeriod,
} from '../enums/index.js';

// ─── Auth ────────────────────────────────────────────────────
export const generateOtpSchema = z.object({
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number')
    .transform((v) => v.replace(/\s+/g, '')),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
  otp: z.string().length(6).regex(/^\d{6}$/, 'OTP must be 6 digits'),
  role: z.nativeEnum(UserRole).optional(),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
});

// ─── Artist Profile ──────────────────────────────────────────
export const createArtistProfileSchema = z.object({
  stage_name: z.string().min(2).max(100),
  bio: z.string().max(2000).optional(),
  genres: z.array(z.string().min(1).max(50)).min(1).max(10),
  languages: z.array(z.string().min(1).max(50)).min(1).max(10),
  base_city: z.string().min(2).max(100),
  travel_radius_km: z.number().int().min(0).max(5000).default(100),
  event_types: z.array(z.nativeEnum(EventType)).min(1),
  performance_duration_min: z.number().int().min(15).max(720),
  performance_duration_max: z.number().int().min(15).max(720),
  pricing: z
    .array(
      z.object({
        event_type: z.nativeEnum(EventType),
        city_tier: z.nativeEnum(CityTier),
        min_price: z.number().int().min(100_00), // min 100 INR
        max_price: z.number().int().min(100_00),
        travel_surcharge: z.number().int().min(0).nullable().default(null),
      }),
    )
    .min(1),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});

export const updateArtistProfileSchema = createArtistProfileSchema.partial();

// ─── Client Profile ──────────────────────────────────────────
export const createClientProfileSchema = z.object({
  client_type: z.enum(['corporate', 'wedding_planner', 'club_venue', 'individual', 'event_company']),
  company_name: z.string().max(200).optional(),
  company_type: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  event_types_interested: z.array(z.string()).max(20).optional(),
  average_budget_min: z.number().int().min(0).optional(),
  average_budget_max: z.number().int().min(0).optional(),
});

// ─── Calendar ────────────────────────────────────────────────
export const updateCalendarSchema = z.object({
  dates: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      status: z.enum([CalendarStatus.AVAILABLE, CalendarStatus.BLOCKED]),
    }),
  ).min(1).max(365),
});

// ─── Search ──────────────────────────────────────────────────
export const searchArtistsSchema = z.object({
  q: z.string().max(200).optional(),
  genre: z.array(z.string()).optional(),
  city: z.string().optional(),
  event_type: z.nativeEnum(EventType).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  budget_min: z.number().int().min(0).optional(),
  budget_max: z.number().int().min(0).optional(),
  distance_km: z.number().min(0).max(5000).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  sort_by: z.enum(['relevance', 'trust_score', 'price_low', 'price_high', 'distance']).default('relevance'),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(20),
});

// ─── Booking ─────────────────────────────────────────────────
export const createBookingSchema = z.object({
  artist_id: z.string().uuid(),
  event_type: z.nativeEnum(EventType),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_city: z.string().min(2).max(100),
  event_venue: z.string().max(500).optional(),
  duration_hours: z.number().min(0.5).max(24),
  requirements: z.string().max(5000).optional(),
});

export const submitQuoteSchema = z.object({
  base_amount: z.number().int().min(0),
  travel_surcharge: z.number().int().min(0).default(0),
  notes: z.string().max(2000).optional(),
});

// ─── Media ───────────────────────────────────────────────────
export const requestUploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.enum([
    'video/mp4',
    'video/quicktime',
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
  ]),
  file_size_bytes: z.number().int().min(1).max(500 * 1024 * 1024), // 500MB max
  type: z.nativeEnum(MediaType),
  title: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).max(10).default([]),
});

export const confirmUploadSchema = z.object({
  media_id: z.string().uuid(),
});

export const reorderMediaSchema = z.object({
  media_ids: z.array(z.string().uuid()).min(1),
});

// ─── Review ──────────────────────────────────────────────────
export const createReviewSchema = z.object({
  booking_id: z.string().uuid(),
  overall_rating: z.number().int().min(1).max(5),
  dimensions: z.object({
    performance_quality: z.number().int().min(1).max(5).optional(),
    professionalism: z.number().int().min(1).max(5).optional(),
    punctuality: z.number().int().min(1).max(5).optional(),
    communication: z.number().int().min(1).max(5).optional(),
    event_organization: z.number().int().min(1).max(5).optional(),
    payment_timeliness: z.number().int().min(1).max(5).optional(),
    respectfulness: z.number().int().min(1).max(5).optional(),
  }),
  comment: z.string().max(2000).optional(),
});

// ─── Payment ─────────────────────────────────────────────────
export const createPaymentOrderSchema = z.object({
  booking_id: z.string().uuid(),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export const paymentWebhookSchema = z.object({
  event: z.string().min(1),
  payload: z.record(z.unknown()),
});

export const settlePaymentSchema = z.object({
  paymentId: z.string().uuid(),
});

export const settleEligibleSchema = z.object({}).strict();

// ─── Dispute ────────────────────────────────────────────────────
export const submitDisputeSchema = z.object({
  booking_id: z.string().uuid(),
  dispute_type: z.nativeEnum(DisputeType),
  description: z.string().min(20).max(5000),
});

export const addDisputeEvidenceSchema = z.object({
  evidence_type: z.enum(['photo', 'video', 'audio', 'document', 'screenshot', 'communication_log']),
  file_url: z.string().url().max(2048),
  description: z.string().max(2000).optional(),
});

export const resolveDisputeSchema = z.object({
  resolution_type: z.nativeEnum(ResolutionType),
  resolution_notes: z.string().min(10).max(5000),
  financial_resolution: z.object({
    refund_amount_paise: z.number().int().min(0).optional(),
    artist_payout_paise: z.number().int().min(0).optional(),
    platform_absorbs_paise: z.number().int().min(0).optional(),
  }).optional(),
  trust_impact: z.object({
    artist_adjustment: z.number().min(-20).max(0).optional(),
    client_adjustment: z.number().min(-20).max(0).optional(),
  }).optional(),
});

export const appealDisputeSchema = z.object({
  reason: z.string().min(20).max(5000),
});

// ─── Cancellation ───────────────────────────────────────────────
export const cancelBookingSchema = z.object({
  sub_type: z.nativeEnum(CancellationSubType),
  reason: z.string().min(10).max(2000),
});

// ─── Bank Account ───────────────────────────────────────────────
export const addBankAccountSchema = z.object({
  account_holder_name: z.string().min(2).max(200),
  account_number: z.string().min(8).max(20).regex(/^\d+$/, 'Account number must be digits only'),
  ifsc_code: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format'),
  bank_name: z.string().min(2).max(200),
  upi_id: z.string().max(100).optional(),
  is_primary: z.boolean().default(true),
});

export const updateBankAccountSchema = addBankAccountSchema.partial();

// ─── Coordination ──────────────────────────────────────────────
export const confirmCheckpointSchema = z.object({
  checkpoint: z.nativeEnum(CoordinationCheckpoint),
});

export const updateLogisticsSchema = z.object({
  travel_mode: z.enum(['flight', 'train', 'car', 'local']).optional(),
  hotel_booked: z.boolean().optional(),
  hotel_details: z.object({
    name: z.string().max(200),
    address: z.string().max(500),
    check_in: z.string(),
    confirmation_id: z.string().max(100).optional(),
  }).optional(),
  parking_arranged: z.boolean().optional(),
  special_rider_notes: z.string().max(2000).optional(),
});

// ─── Event Day ─────────────────────────────────────────────────
export const recordArrivalSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const flagIssueSchema = z.object({
  type: z.nativeEnum(EventDayIssueType),
  description: z.string().min(10).max(2000),
});

// ─── Failure Capture ───────────────────────────────────────────
export const recordFailureSchema = z.object({
  event_type: z.enum(['abandoned_flow']),
  stage: z.string().max(50),
  search_params: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ─── Event Context ──────────────────────────────────────────────
export const submitEventContextSchema = z.object({
  crowd_size_estimate: z.number().int().min(1).max(100000),
  crowd_energy: z.nativeEnum(CrowdEnergyLevel),
  primary_age_group: z.nativeEnum(DemographicAgeGroup),
  secondary_age_group: z.nativeEnum(DemographicAgeGroup).optional(),
  gender_ratio_male_pct: z.number().int().min(0).max(100),
  vibe_tags: z.array(z.string().min(1).max(50)).min(1).max(10),
  genre_reception: z.record(z.number().min(1).max(5)),
  set_highlights: z.string().max(2000).optional(),
  would_rebook_artist: z.boolean(),
  venue_acoustics_rating: z.number().int().min(1).max(5).optional(),
  venue_crowd_flow_rating: z.number().int().min(1).max(5).optional(),
  audience_requests: z.array(z.string().max(200)).max(20).default([]),
  weather_conditions: z.string().max(200).optional(),
});

// ─── Venue ──────────────────────────────────────────────────────
export const createVenueSchema = z.object({
  name: z.string().min(2).max(200),
  venue_type: z.string().min(2).max(50),
  city: z.string().min(2).max(100),
  city_tier: z.nativeEnum(CityTier),
  address: z.string().min(5).max(500),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  capacity_min: z.number().int().min(1).max(100000),
  capacity_max: z.number().int().min(1).max(100000),
  indoor: z.boolean().default(false),
  outdoor_covered: z.boolean().default(false),
  outdoor_open: z.boolean().default(false),
  stage_width_ft: z.number().min(1).max(500).optional(),
  stage_depth_ft: z.number().min(1).max(500).optional(),
  ceiling_height_ft: z.number().min(1).max(200).optional(),
  power_supply_kva: z.number().int().min(1).optional(),
  has_green_room: z.boolean().default(false),
  has_parking: z.boolean().default(false),
  parking_capacity: z.number().int().min(0).optional(),
  load_in_access: z.string().max(500).optional(),
  photos: z.array(z.string().url().max(2048)).max(20).default([]),
  contact_name: z.string().max(200).optional(),
  contact_phone: z.string().max(20).optional(),
  contact_email: z.string().email().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateVenueSchema = createVenueSchema.partial();

export const addVenueEquipmentSchema = z.object({
  category: z.nativeEnum(RiderItemCategory),
  item_name: z.string().min(1).max(200),
  quantity: z.number().int().min(1).default(1),
  condition: z.enum(['excellent', 'good', 'fair']).optional(),
  notes: z.string().max(500).optional(),
});

export const venueSearchSchema = z.object({
  q: z.string().max(200).optional(),
  city: z.string().optional(),
  venue_type: z.string().optional(),
  capacity_min: z.number().int().min(0).optional(),
  capacity_max: z.number().int().min(0).optional(),
  has_green_room: z.boolean().optional(),
  has_parking: z.boolean().optional(),
  indoor: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(20),
});

// ─── Rider ──────────────────────────────────────────────────────
export const createRiderSchema = z.object({
  notes: z.string().max(2000).optional(),
  hospitality_requirements: z.record(z.unknown()).default({}),
  travel_requirements: z.record(z.unknown()).default({}),
});

export const addRiderLineItemSchema = z.object({
  category: z.nativeEnum(RiderItemCategory),
  item_name: z.string().min(1).max(200),
  quantity: z.number().int().min(1).default(1),
  priority: z.nativeEnum(RiderPriority),
  specifications: z.string().max(1000).optional(),
  alternatives: z.array(z.string().max(200)).max(5).default([]),
  sort_order: z.number().int().min(0).default(0),
});

export const updateRiderLineItemSchema = addRiderLineItemSchema.partial();

export const updateRiderCheckSchema = z.object({
  fulfillment_status: z.nativeEnum(RiderFulfillmentStatus),
  alternative_offered: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

// ─── Calendar Intelligence ──────────────────────────────────────
export const demandForecastQuerySchema = z.object({
  city: z.string().optional(),
  genre: z.string().optional(),
  event_type: z.nativeEnum(EventType).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const calendarIntelligenceQuerySchema = z.object({
  alert_type: z.string().optional(),
  is_read: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(20),
});

// ─── Pricing Brain ──────────────────────────────────────────────
export const pricingBrainQuerySchema = z.object({
  event_type: z.nativeEnum(EventType).optional(),
  city: z.string().optional(),
  genre: z.string().optional(),
});

export const dismissRecommendationSchema = z.object({
  reason: z.string().max(500).optional(),
});

// ─── Workspace ──────────────────────────────────────────────────
export const brandKitSchema = z.object({
  logo_url: z.string().url().max(2048).optional(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  font_family: z.string().max(100).optional(),
  brand_voice: z.enum(['formal', 'casual', 'luxurious', 'youthful', 'professional']).optional(),
  signature_tagline: z.string().max(500).optional(),
  whatsapp_business_number: z.string().max(20).optional(),
  business_email: z.string().email().max(200).optional(),
}).partial();

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().max(2000).optional(),
  website: z.string().url().max(500).optional(),
  city: z.string().max(100).optional(),
  company_type: z.enum(['event_management', 'wedding_planner', 'corporate', 'agency']).optional(),
  logo_url: z.string().url().max(2048).optional(),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  brand_kit: brandKitSchema.optional(),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial();

export const inviteWorkspaceMemberSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  role: z.nativeEnum(WorkspaceRole),
});

export const updateWorkspaceMemberSchema = z.object({
  role: z.nativeEnum(WorkspaceRole),
});

export const createWorkspaceEventSchema = z.object({
  name: z.string().min(2).max(255),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  event_city: z.string().min(2).max(100),
  venue_id: z.string().uuid().optional(),
  event_type: z.nativeEnum(EventType),
  guest_count: z.number().int().min(1).max(100000).optional(),
  budget_min_paise: z.number().int().min(0).optional(),
  budget_max_paise: z.number().int().min(0).optional(),
  notes: z.string().max(5000).optional(),
  client_name: z.string().max(255).optional(),
  client_phone: z.string().max(20).optional(),
  client_email: z.string().email().max(200).optional(),
});

export const updateWorkspaceEventSchema = createWorkspaceEventSchema.partial().extend({
  status: z.nativeEnum(WorkspaceEventStatus).optional(),
});

export const linkBookingsToEventSchema = z.object({
  bookings: z.array(z.object({
    booking_id: z.string().uuid(),
    role_label: z.string().max(100).optional(),
  })).min(1).max(20),
});

export const createPresentationSchema = z.object({
  title: z.string().min(2).max(255),
  workspace_event_id: z.string().uuid().optional(),
  artist_ids: z.array(z.string().uuid()).min(1).max(50),
  notes_per_artist: z.record(z.string().max(500)).default({}),
  custom_header: z.string().max(2000).optional(),
  custom_footer: z.string().max(2000).optional(),
  include_pricing: z.boolean().default(false),
  include_media: z.boolean().default(true),
  expires_at: z.string().datetime().optional(),
});

export const bulkActionSchema = z.object({
  booking_ids: z.array(z.string().uuid()).min(1).max(50),
  action: z.enum(['confirm', 'cancel']),
  reason: z.string().max(2000).optional(),
});

export const workspacePipelineQuerySchema = z.object({
  state: z.string().optional(),
  event_type: z.nativeEnum(EventType).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(20),
});

// ─── Dynamic Pricing ────────────────────────────────────────────
export const createPriceRuleSchema = z.object({
  rule_type: z.enum(['demand_surge', 'last_minute_discount', 'repeat_client', 'seasonal']),
  conditions: z.record(z.unknown()),
  action: z.record(z.unknown()),
  max_adjustment_pct: z.number().min(1).max(100).optional(),
  min_price_paise: z.number().int().min(0).optional(),
  event_types: z.array(z.string()).optional(),
  cities: z.array(z.string()).optional(),
});

export const updatePriceRuleSchema = createPriceRuleSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export const dynamicPriceQuerySchema = z.object({
  event_type: z.nativeEnum(EventType),
  city: z.string().min(1),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const surgeIndicatorQuerySchema = z.object({
  city: z.string().min(1),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_type: z.nativeEnum(EventType).optional(),
});

// ─── Recommendation ─────────────────────────────────────────────
export const recommendationQuerySchema = z.object({
  event_type: z.nativeEnum(EventType).optional(),
  city: z.string().optional(),
  budget_min: z.number().int().min(0).optional(),
  budget_max: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export const recommendationFeedbackSchema = z.object({
  action: z.enum(['clicked', 'booked', 'dismissed', 'shortlisted']),
});

// ─── Artist Intelligence ────────────────────────────────────────
export const earningsQuerySchema = z.object({
  period_type: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ─── Voice Query ───────────────────────────────────────────────

export const voiceQuerySchema = z.object({
  text: z.string().min(1).max(1000),
  session_id: z.string().uuid().optional(),
  current_page: z.string().max(200).optional(),
});

export const voiceSessionQuerySchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
});

// ─── Emergency Substitution ───────────────────────────────────

export const createSubstitutionRequestSchema = z.object({
  original_booking_id: z.string().uuid(),
  urgency_level: z.nativeEnum(SubstitutionUrgencyLevel).default(SubstitutionUrgencyLevel.URGENT),
});

export const respondSubstitutionSchema = z.object({
  response: z.enum(['accepted', 'declined']),
  decline_reason: z.string().max(500).optional(),
  quoted_amount_paise: z.number().int().min(0).optional(),
});

// ─── Seasonal Demand Intelligence ─────────────────────────────

export const seasonalDemandQuerySchema = z.object({
  city: z.string().optional(),
  genre: z.string().optional(),
  event_type: z.nativeEnum(EventType).optional(),
});

export const seasonalAlertQuerySchema = z.object({
  is_read: z.boolean().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const availabilityUrgencyQuerySchema = z.object({
  event_type: z.nativeEnum(EventType),
  city: z.string(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// ─── Reputation Defense ──────────────────────────────────────

export const submitReviewDisputeSchema = z.object({
  reason: z.string().min(10).max(2000),
  evidence_urls: z.array(z.string().url()).max(10).default([]),
});

export const respondReviewSchema = z.object({
  response_text: z.string().min(10).max(1000),
});

export const resolveReviewDisputeSchema = z.object({
  resolution: z.enum(['upheld', 'overturned', 'dismissed']),
  admin_notes: z.string().max(2000).optional(),
});

export const venueIssueReportSchema = z.object({
  venue_id: z.string().uuid(),
  booking_id: z.string().uuid().optional(),
  issue_type: z.string().min(1).max(100),
  description: z.string().min(10).max(2000),
});

export const verifyVenueIssueSchema = z.object({
  is_verified: z.boolean(),
  auto_advisory: z.string().max(500).optional(),
});

// ─── Financial Command Center ────────────────────────────────

export const financialSnapshotQuerySchema = z.object({
  artist_id: z.string().uuid().optional(),
});

export const cashFlowForecastQuerySchema = z.object({
  period: z.nativeEnum(FinancialPeriod).optional(),
});

export const incomeCertificateRequestSchema = z.object({
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const taxSummaryQuerySchema = z.object({
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// ─── Gig Advisor v2 ──────────────────────────────────────────

export const gigComparisonSchema = z.object({
  booking_ids: z.array(z.string().uuid()).min(1).max(5),
});

export const gigAdvisorV2QuerySchema = z.object({
  include_all_active: z.boolean().default(true),
});

// ─── Backup Preferences ─────────────────────────────────────

export const updateBackupPreferencesSchema = z.object({
  is_reliable_backup: z.boolean(),
  backup_premium_pct: z.number().int().min(0).max(100).default(25),
});

// ─── Social Media Analyzer ──────────────────────────────────

export const analyzeSocialProfileSchema = z.object({
  platform: z.enum(['instagram', 'youtube']),
  profile_url: z.string().url().max(500),
});

// ─── Workspace Commission ────────────────────────────────────

export const updateWorkspaceCommissionSchema = z.object({
  default_commission_pct: z.number().min(0).max(50),
});

export const updateBookingCommissionSchema = z.object({
  commission_pct: z.number().min(0).max(50),
});

// ─── Gig Marketplace ────────────────────────────────────────

export const createGigPostSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  event_type: z.nativeEnum(EventType),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_city: z.string().min(1).max(100),
  genres_needed: z.array(z.string()).min(1).max(10),
  budget_min_paise: z.number().int().min(0),
  budget_max_paise: z.number().int().min(0),
  guest_count: z.number().int().min(1).optional(),
  duration_hours: z.number().min(0.5).max(24).optional(),
  requirements: z.string().max(2000).optional(),
  expires_at: z.string().optional(),
});

export const updateGigPostSchema = createGigPostSchema.partial();

export const gigPostQuerySchema = z.object({
  city: z.string().optional(),
  event_type: z.nativeEnum(EventType).optional(),
  genre: z.string().optional(),
  budget_min: z.number().int().min(0).optional(),
  budget_max: z.number().int().min(0).optional(),
  status: z.enum(['open', 'closed', 'filled', 'cancelled', 'expired']).optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(50).default(20),
});

export const createGigApplicationSchema = z.object({
  cover_note: z.string().max(1000).optional(),
  proposed_amount_paise: z.number().int().min(0).optional(),
});

export const respondGigApplicationSchema = z.object({
  status: z.enum(['shortlisted', 'accepted', 'rejected']),
});

// ─── Gamification ───────────────────────────────────────────

export const gamificationClaimBadgeSchema = z.object({
  badge_type: z.enum(['verified_artist', 'top_performer', 'rising_star', 'reliable_backup', 'early_bird', 'crowd_favorite']),
});

// ─── Artist Microsite ──────────────────────────────────────

export const micrositeSettingsSchema = z.object({
  layout_variant: z.enum(['classic', 'modern', 'minimal']).default('classic'),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  hero_image_url: z.string().url().optional(),
  featured_review_ids: z.array(z.string().uuid()).max(5).optional(),
  featured_media_ids: z.array(z.string().uuid()).max(10).optional(),
});

// ─── Public Event Dashboard ─────────────────────────────────

export const publicDashboardSettingsSchema = z.object({
  public_dashboard_enabled: z.boolean(),
  client_visible_fields: z.array(z.string()).default(['name', 'date', 'venue', 'artists', 'status']),
});

// ─── Notification Preferences ──────────────────────────────────
export const updateNotificationPrefsSchema = z.object({
  whatsapp: z.boolean().optional(),
  sms: z.boolean().optional(),
  push: z.boolean().optional(),
  email: z.boolean().optional(),
});

// ─── Shortlist ─────────────────────────────────────────────────
export const createShortlistSchema = z.object({
  name: z.string().min(1).max(200),
});

export const addArtistToShortlistSchema = z.object({
  artist_id: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});

// ─── Concierge ─────────────────────────────────────────────────
export const conciergeSearchSchema = z.object({
  q: z.string().max(200).optional(),
  genre: z.array(z.string()).optional(),
  city: z.string().optional(),
  event_type: z.nativeEnum(EventType).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  budget_min: z.number().int().min(0).optional(),
  budget_max: z.number().int().min(0).optional(),
  distance_km: z.number().min(0).max(5000).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const conciergeCreateBookingSchema = z.object({
  client_user_id: z.string().uuid(),
  artist_id: z.string().uuid(),
  event_type: z.nativeEnum(EventType),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_city: z.string().min(2).max(100),
  event_venue: z.string().max(500).optional(),
  duration_hours: z.number().min(0.5).max(24),
  requirements: z.string().max(5000).optional(),
});

// ─── Client Profile Update ─────────────────────────────────────
export const updateClientProfileSchema = createClientProfileSchema.partial();

// ─── InstaBook Interest (Waitlist) ──────────────────────────────
export const instabookInterestSchema = z.object({
  role: z.enum(['artist', 'event_company', 'client', 'agent']),
  name: z.string().min(2).max(200),
  phone: z.string().min(10).max(20),
  email: z.string().email().max(200).optional().or(z.literal('')),
  city: z.string().min(2).max(100),
  excitement_score: z.number().int().min(1).max(5),
  top_concern: z.string().max(2000).optional().or(z.literal('')),
  would_use_first_month: z.enum(['yes', 'no', 'maybe']),
  role_specific_data: z.record(z.unknown()).default({}),
  source: z.enum(['web', 'voice_en', 'voice_hi']).default('web'),
});
