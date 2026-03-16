import { z } from 'zod';
import { UserRole, EventType, CityTier, CalendarStatus, MediaType } from '../enums/index.js';

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
