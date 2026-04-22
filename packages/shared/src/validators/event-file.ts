/**
 * Event Company OS pivot (2026-04-22) — Event File Zod validators.
 *
 * Validates request bodies for /v1/event-files and /v1/event-files/:id/vendors.
 */
import { z } from 'zod';

export const EventFileStatus = z.enum([
  'planning',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
]);
export type EventFileStatusType = z.infer<typeof EventFileStatus>;

// HH:mm or HH:mm:ss
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Time must be HH:mm or HH:mm:ss');

export const createEventFileSchema = z.object({
  event_name: z.string().min(2).max(300),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  call_time: timeSchema.optional(),
  city: z.string().min(1).max(100),
  venue: z.string().max(500).optional(),
  brief: z.record(z.string(), z.unknown()).optional(),
  budget_paise: z.number().int().min(0).optional(),
});
export type CreateEventFileInput = z.infer<typeof createEventFileSchema>;

export const updateEventFileSchema = createEventFileSchema.partial().extend({
  status: EventFileStatus.optional(),
});
export type UpdateEventFileInput = z.infer<typeof updateEventFileSchema>;

export const addEventFileVendorSchema = z.object({
  vendor_profile_id: z.string().uuid(),
  role: z.string().min(1).max(50).default('primary'),
  call_time_override: timeSchema.optional(),
  booking_id: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});
export type AddEventFileVendorInput = z.infer<typeof addEventFileVendorSchema>;
