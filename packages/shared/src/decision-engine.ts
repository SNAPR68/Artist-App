import { z } from 'zod';
import { EventType } from './enums/index.js';

// ─── Decision Engine Schemas ────────────────────────────────

export const decisionBriefSchema = z.object({
  raw_text: z.string().min(1).max(5000),
  source: z.enum(['web', 'whatsapp', 'voice']).default('web'),
  event_type: z.nativeEnum(EventType).optional(),
  city: z.string().min(2).max(100).optional(),
  event_date: z.string().optional(),
  audience_size: z.number().int().min(1).max(100000).optional(),
  budget_min_paise: z.number().int().min(0).optional(),
  budget_max_paise: z.number().int().min(0).optional(),
  genres: z.array(z.string().min(1).max(50)).max(10).optional(),
  vibe_tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  is_family_safe: z.boolean().optional(),
  workspace_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(), // brief_id from previous turn (clarifying answer)
});

export const decisionParsedBriefSchema = z.object({
  event_type: z.nativeEnum(EventType).nullable(),
  city: z.string().nullable(),
  event_date: z.string().nullable(),
  audience_size: z.number().nullable(),
  budget_min_paise: z.number().nullable(),
  budget_max_paise: z.number().nullable(),
  genres: z.array(z.string()),
  vibe_tags: z.array(z.string()),
  is_family_safe: z.boolean(),
  confidence: z.number().min(0).max(1),
});

export const decisionRecommendationSchema = z.object({
  id: z.string().uuid(),
  artist_id: z.string().uuid(),
  artist_name: z.string(),
  artist_type: z.string(),
  profile_image: z.string().nullable(),
  score: z.number(),
  confidence: z.number(),
  rank: z.number(),
  price_min_paise: z.number(),
  price_max_paise: z.number(),
  expected_close_paise: z.number().nullable(),
  why_fit: z.array(z.string()),
  risk_flags: z.array(z.string()),
  logistics_flags: z.array(z.string()),
  score_breakdown: z.object({
    event_type_fit: z.number(),
    audience_vibe_fit: z.number(),
    budget_fit: z.number(),
    reliability: z.number(),
    logistics: z.number(),
    momentum: z.number(),
    strategic: z.number(),
  }),
});

export const decisionResponseSchema = z.object({
  brief_id: z.string().uuid(),
  summary: z.string(),
  parsed_brief: decisionParsedBriefSchema,
  recommendations: z.array(decisionRecommendationSchema),
  constraints_note: z.string().nullable(),
});

// ─── Conversational Brief Response (homepage chat) ────────
// Discriminated union: clarifying questions OR recommendations

export const decisionClarifyingQuestionOptionSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
});

export const decisionClarifyingQuestionSchema = z.object({
  field: z.string(),
  question: z.string(),
  question_hi: z.string(),
  options: z.array(decisionClarifyingQuestionOptionSchema),
});

export const decisionConversationResponseSchema = z.union([
  z.object({
    response_type: z.literal('clarifying_questions'),
    session_id: z.string().uuid(),
    response_text: z.string(),
    clarifying_questions: z.array(decisionClarifyingQuestionSchema),
    parsed_context: z.record(z.unknown()),
  }),
  z.object({
    response_type: z.literal('recommendations'),
    session_id: z.string().uuid(),
    response_text: z.string(),
    brief_id: z.string().uuid(),
    summary: z.string(),
    parsed_brief: decisionParsedBriefSchema,
    recommendations: z.array(decisionRecommendationSchema),
    constraints_note: z.string().nullable(),
  }),
]);

export type DecisionClarifyingQuestion = z.infer<typeof decisionClarifyingQuestionSchema>;
export type DecisionConversationResponse = z.infer<typeof decisionConversationResponseSchema>;

export const decisionProposalRequestSchema = z.object({
  artist_ids: z.array(z.string().uuid()).min(1).max(10),
  include_pricing: z.boolean().default(true),
  contact_name: z.string().max(200).optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
});

export const decisionLockRequestSchema = z.object({
  artist_id: z.string().uuid(),
  preferred_date: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

// ─── Type Aliases ───────────────────────────────────────────

export type DecisionBriefInput = z.infer<typeof decisionBriefSchema>;
export type DecisionParsedBrief = z.infer<typeof decisionParsedBriefSchema>;
export type DecisionRecommendation = z.infer<typeof decisionRecommendationSchema>;
export type DecisionResponse = z.infer<typeof decisionResponseSchema>;
export type DecisionProposalRequest = z.infer<typeof decisionProposalRequestSchema>;
export type DecisionLockRequest = z.infer<typeof decisionLockRequestSchema>;
