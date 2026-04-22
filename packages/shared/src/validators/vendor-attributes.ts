/**
 * Event Company OS pivot (2026-04-22) — per-category JSONB attribute schemas
 * for artist_profiles.category_attributes.
 *
 * These Zod schemas validate the shape of `category_attributes` based on the
 * row's `category` enum. Validation happens at the API layer (not DB) because
 * Postgres JSONB has no per-discriminator schema enforcement.
 *
 * Each schema is intentionally minimal — only fields the voice engine /
 * search filters / microsite template actually read. Agencies can add
 * arbitrary extra keys (JSONB allows it); we just don't guarantee they
 * render anywhere.
 */

import { z } from 'zod';
import { VendorCategory } from '../enums/index.js';

// ─── Per-category attribute schemas ─────────────────────────────

export const artistAttributesSchema = z.object({
  genres: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  setup_minutes: z.number().int().min(0).optional(),
  has_own_sound: z.boolean().default(false),
});

export const avAttributesSchema = z.object({
  max_watts: z.number().int().positive().optional(),
  stage_size_ft: z
    .object({ width: z.number(), depth: z.number() })
    .optional(),
  light_units: z.number().int().min(0).optional(),
  led_wall_sqft: z.number().min(0).optional(),
  truss_available: z.boolean().default(false),
});

export const photoAttributesSchema = z.object({
  photographers: z.number().int().min(0).default(1),
  videographers: z.number().int().min(0).default(0),
  drone: z.boolean().default(false),
  same_day_edit: z.boolean().default(false),
  backup_shooter: z.boolean().default(false),
});

export const decorAttributesSchema = z.object({
  themes: z.array(z.string()).default([]),
  flower_types: z.array(z.string()).default([]),
  setup_hours: z.number().int().min(0).optional(),
  indoor_outdoor: z.enum(['indoor', 'outdoor', 'both']).default('both'),
  custom_fab: z.boolean().default(false),
});

export const licenseAttributesSchema = z.object({
  license_types: z
    .array(
      z.enum([
        'PPL',
        'IPRS',
        'Novex',
        'Police NOC',
        'Fire NOC',
        'Excise',
        'Loudspeaker',
      ]),
    )
    .default([]),
  cities_covered: z.array(z.string()).default([]),
  turnaround_days: z.number().int().positive().optional(),
  govt_fees_included: z.boolean().default(false),
});

export const promotersAttributesSchema = z.object({
  staff_types: z
    .array(
      z.enum(['usher', 'registration', 'sampling', 'crowd_control', 'brand_ambassador']),
    )
    .default([]),
  cities: z.array(z.string()).default([]),
  min_headcount: z.number().int().min(1).default(10),
  rate_per_head: z.number().min(0).optional(),
  uniform_included: z.boolean().default(false),
});

export const transportAttributesSchema = z.object({
  vehicle_types: z
    .array(
      z.enum(['sedan', 'innova', 'tempo_traveller', 'mini_bus', 'luxury_coach']),
    )
    .default([]),
  cities: z.array(z.string()).default([]),
  with_driver: z.boolean().default(true),
  fuel_included: z.boolean().default(false),
  standby_hourly_rate: z.number().min(0).optional(),
});

// ─── Discriminated union by category ────────────────────────────

export const vendorCategoryAttributesSchema = z.discriminatedUnion('category', [
  z.object({ category: z.literal(VendorCategory.ARTIST), attributes: artistAttributesSchema }),
  z.object({ category: z.literal(VendorCategory.AV), attributes: avAttributesSchema }),
  z.object({ category: z.literal(VendorCategory.PHOTO), attributes: photoAttributesSchema }),
  z.object({ category: z.literal(VendorCategory.DECOR), attributes: decorAttributesSchema }),
  z.object({ category: z.literal(VendorCategory.LICENSE), attributes: licenseAttributesSchema }),
  z.object({ category: z.literal(VendorCategory.PROMOTERS), attributes: promotersAttributesSchema }),
  z.object({ category: z.literal(VendorCategory.TRANSPORT), attributes: transportAttributesSchema }),
]);

/** Lookup the schema for a given category (used in API handlers). */
export function getAttributesSchemaForCategory(category: VendorCategory) {
  switch (category) {
    case VendorCategory.ARTIST:
      return artistAttributesSchema;
    case VendorCategory.AV:
      return avAttributesSchema;
    case VendorCategory.PHOTO:
      return photoAttributesSchema;
    case VendorCategory.DECOR:
      return decorAttributesSchema;
    case VendorCategory.LICENSE:
      return licenseAttributesSchema;
    case VendorCategory.PROMOTERS:
      return promotersAttributesSchema;
    case VendorCategory.TRANSPORT:
      return transportAttributesSchema;
  }
}

// ─── Inferred types ─────────────────────────────────────────────

export type ArtistAttributes = z.infer<typeof artistAttributesSchema>;
export type AvAttributes = z.infer<typeof avAttributesSchema>;
export type PhotoAttributes = z.infer<typeof photoAttributesSchema>;
export type DecorAttributes = z.infer<typeof decorAttributesSchema>;
export type LicenseAttributes = z.infer<typeof licenseAttributesSchema>;
export type PromotersAttributes = z.infer<typeof promotersAttributesSchema>;
export type TransportAttributes = z.infer<typeof transportAttributesSchema>;
