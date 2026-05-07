/**
 * Proposal-with-P&L (2026-05-05) — Zod validators.
 *
 * Validates request bodies for /v1/workspaces/:wid/proposals and
 * /v1/public/proposals/:token.
 */
import { z } from 'zod';

export const ProposalStatus = z.enum([
  'draft',
  'sent',
  'viewed',
  'accepted',
  'declined',
  'expired',
]);
export type ProposalStatusType = z.infer<typeof ProposalStatus>;

export const ProposalCategory = z.enum([
  'artist',
  'av',
  'photo',
  'decor',
  'license',
  'promoters',
  'transport',
  'other',
]);
export type ProposalCategoryType = z.infer<typeof ProposalCategory>;

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
const phoneOptional = z
  .string()
  .max(20)
  .regex(/^[+\d\s\-()]{0,20}$/, 'Invalid phone format')
  .optional()
  .or(z.literal(''));

export const createProposalSchema = z.object({
  client_name: z.string().min(2).max(200),
  client_email: z.string().email().max(200).optional().or(z.literal('')),
  client_phone: phoneOptional,
  event_title: z.string().min(2).max(300),
  event_date: dateString.optional(),
  venue_text: z.string().max(500).optional(),
  event_file_id: z.string().uuid().optional(),
});
export type CreateProposalInput = z.infer<typeof createProposalSchema>;

export const updateProposalSchema = createProposalSchema.partial().extend({
  valid_until: dateString.optional(),
});
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;

export const proposalListQuerySchema = z.object({
  status: ProposalStatus.optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});
export type ProposalListQuery = z.infer<typeof proposalListQuerySchema>;

export const createProposalLineItemSchema = z.object({
  category: ProposalCategory,
  description: z.string().min(1).max(500),
  notes: z.string().max(2000).optional(),
  qty: z.number().positive().max(10000).default(1),
  cost_paise: z.number().int().min(0),
  sell_paise: z.number().int().min(0),
  sort_order: z.number().int().min(0).default(0),
});
export type CreateProposalLineItemInput = z.infer<typeof createProposalLineItemSchema>;

export const updateProposalLineItemSchema = createProposalLineItemSchema.partial();
export type UpdateProposalLineItemInput = z.infer<typeof updateProposalLineItemSchema>;

export const sendProposalSchema = z.object({
  valid_until: dateString.optional(),
});
export type SendProposalInput = z.infer<typeof sendProposalSchema>;

// ─── Public client-facing endpoints ─────────────────────────────
export const acceptProposalSchema = z.object({
  client_name: z.string().min(2).max(200),
  client_signature_text: z.string().max(200).optional(),
});
export type AcceptProposalInput = z.infer<typeof acceptProposalSchema>;

export const declineProposalSchema = z.object({
  reason: z.string().max(2000).optional(),
});
export type DeclineProposalInput = z.infer<typeof declineProposalSchema>;
