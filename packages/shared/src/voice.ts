import { z } from 'zod';

// ─── Voice Card Types ──────────────────────────────────────

export const VOICE_CARD_TYPES = [
  'artist_recommendation',
  'artist_discover',
  'booking_status',
  'proposal_summary',
  'earnings_summary',
  'confirmation_prompt',
  'error',
] as const;

export type VoiceCardType = (typeof VOICE_CARD_TYPES)[number];

// ─── Card Data Schemas ─────────────────────────────────────

export const voiceArtistCardSchema = z.object({
  id: z.string().uuid(),
  stage_name: z.string(),
  artist_type: z.string().optional(),
  genres: z.array(z.string()).optional(),
  trust_score: z.number().optional(),
  base_city: z.string().optional(),
  thumbnail_url: z.string().nullable().optional(),
  is_verified: z.boolean().optional(),
  total_bookings: z.number().optional(),
  price_min_paise: z.number().nullable().optional(),
  price_max_paise: z.number().nullable().optional(),
  // Decision engine fields (recommendation cards)
  score: z.number().optional(),
  confidence: z.number().optional(),
  rank: z.number().optional(),
  why_fit: z.array(z.string()).optional(),
  risk_flags: z.array(z.string()).optional(),
  logistics_flags: z.array(z.string()).optional(),
  expected_close_paise: z.number().nullable().optional(),
  score_breakdown: z.object({
    event_type_fit: z.number(),
    audience_vibe_fit: z.number(),
    budget_fit: z.number(),
    reliability: z.number(),
    logistics: z.number(),
    momentum: z.number(),
    strategic: z.number(),
  }).optional(),
});

export const voiceBookingCardSchema = z.object({
  id: z.string().uuid(),
  artist_name: z.string(),
  artist_thumbnail: z.string().nullable().optional(),
  event_type: z.string().optional(),
  event_date: z.string().nullable().optional(),
  venue_city: z.string().optional(),
  status: z.string(),
  amount_paise: z.number().optional(),
});

export const voiceProposalCardSchema = z.object({
  brief_id: z.string().uuid(),
  summary: z.string(),
  artist_count: z.number(),
  artists: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    price_range: z.string(),
  })),
  total_estimate_paise: z.number().optional(),
});

export const voiceEarningsCardSchema = z.object({
  total_paise: z.number(),
  period: z.string(),
  booking_count: z.number(),
  change_pct: z.number().nullable().optional(),
  top_gigs: z.array(z.object({
    artist_name: z.string().optional(),
    event_type: z.string().optional(),
    amount_paise: z.number(),
    date: z.string(),
  })).optional(),
});

export const voiceConfirmationCardSchema = z.object({
  action: z.string(),
  description: z.string(),
  confirm_label: z.string(),
  cancel_label: z.string(),
  payload: z.record(z.unknown()).optional(),
});

// ─── Voice Card Union ──────────────────────────────────────

export const voiceCardSchema = z.object({
  type: z.enum(VOICE_CARD_TYPES),
  data: z.unknown(),
});

export type VoiceCard = z.infer<typeof voiceCardSchema>;
export type VoiceArtistCard = z.infer<typeof voiceArtistCardSchema>;
export type VoiceBookingCard = z.infer<typeof voiceBookingCardSchema>;
export type VoiceProposalCard = z.infer<typeof voiceProposalCardSchema>;
export type VoiceEarningsCard = z.infer<typeof voiceEarningsCardSchema>;
export type VoiceConfirmationCard = z.infer<typeof voiceConfirmationCardSchema>;

// ─── Follow-Up ─────────────────────────────────────────────

export const voiceFollowUpSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).max(4),
});

export type VoiceFollowUp = z.infer<typeof voiceFollowUpSchema>;

// ─── Rich Response Message ─────────────────────────────────

export const clarifyingQuestionSchema = z.object({
  field: z.string(),
  question: z.string(),
  question_hi: z.string(),
  options: z.array(z.object({ label: z.string(), value: z.union([z.string(), z.number()]) })),
});

export const voiceResponseMessageSchema = z.object({
  text: z.string(),
  response_type: z.enum(['clarifying_questions', 'recommendations', 'default']).optional(),
  cards: z.array(voiceCardSchema).optional(),
  clarifying_questions: z.array(clarifyingQuestionSchema).optional(),
  parsed_context: z.record(z.unknown()).optional(),
  follow_up: voiceFollowUpSchema.optional(),
  suggestions: z.array(z.string()).optional(),
  action: z.object({
    type: z.enum(['navigate', 'execute']),
    route: z.string().optional(),
    params: z.record(z.unknown()).optional(),
  }).optional(),
});

export type VoiceResponseMessage = z.infer<typeof voiceResponseMessageSchema>;

// ─── Clarifying Questions ──────────────────────────────────

export interface ClarifyingQuestionOption {
  label: string;
  value: string | number;
}

export interface ClarifyingQuestion {
  field: string;
  question: string;
  question_hi: string;
  options: ClarifyingQuestionOption[];
}

export interface ClarifyingState {
  phase: 'collecting' | 'ready';
  original_query: string;
  collected_entities: Record<string, unknown>;
  asked_fields: string[];
  clarifying_rounds: number;
  user_skipped: boolean;
}

// ─── Conversation Memory ───────────────────────────────────

export interface VoiceConversationMemory {
  carried_entities: {
    city?: string;
    event_type?: string;
    budget_max_paise?: number;
    budget_min_paise?: number;
    event_date?: string;
    genres?: string[];
    audience_size?: number;
  };
  last_results?: {
    type: 'discover' | 'recommendations' | 'bookings' | 'earnings';
    items: string[]; // IDs
    brief_id?: string;
  };
  pending_action?: {
    type: 'proposal' | 'lock' | 'book' | 'confirm';
    brief_id?: string;
    artist_id?: string;
    booking_id?: string;
    selected_artists?: string[];
  };
}
