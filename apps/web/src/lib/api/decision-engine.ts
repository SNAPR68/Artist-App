import { apiClient } from '../api-client';

export interface DecisionRecommendation {
  id: string;
  artist_id: string;
  artist_name: string;
  artist_type: string;
  profile_image: string | null;
  score: number;
  confidence: number;
  rank: number;
  price_min_paise: number;
  price_max_paise: number;
  expected_close_paise: number | null;
  why_fit: string[];
  risk_flags: string[];
  logistics_flags: string[];
  score_breakdown: {
    event_type_fit: number;
    audience_vibe_fit: number;
    budget_fit: number;
    reliability: number;
    logistics: number;
    momentum: number;
    strategic: number;
  };
}

export interface DecisionResponse {
  brief_id: string;
  summary: string;
  parsed_brief: Record<string, unknown>;
  recommendations: DecisionRecommendation[];
  constraints_note: string | null;
}

export function parseBrief(rawText: string) {
  return apiClient<Record<string, unknown>>('/v1/decision-engine/parse', {
    method: 'POST',
    body: JSON.stringify({ raw_text: rawText }),
  });
}

export function createBrief(data: {
  raw_text: string;
  source?: string;
  event_type?: string;
  city?: string;
  event_date?: string;
  audience_size?: number;
  budget_min_paise?: number;
  budget_max_paise?: number;
  genres?: string[];
  vibe_tags?: string[];
  is_family_safe?: boolean;
  workspace_id?: string;
}) {
  return apiClient<DecisionResponse>('/v1/decision-engine/brief', {
    method: 'POST',
    body: JSON.stringify({ ...data, source: data.source ?? 'web' }),
  });
}

export function getBrief(briefId: string) {
  return apiClient<DecisionResponse>(`/v1/decision-engine/${briefId}`);
}

export function generateProposal(briefId: string, data: {
  artist_ids: string[];
  include_pricing?: boolean;
  contact_name?: string;
  contact_email?: string;
  client_notes?: string;
}) {
  return apiClient<Record<string, unknown>>(`/v1/decision-engine/${briefId}/proposal`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function lockAvailability(briefId: string, data: {
  artist_id: string;
  preferred_date?: string;
  notes?: string;
}) {
  return apiClient<{ booking_id: string; status: string; message: string }>(
    `/v1/decision-engine/${briefId}/lock`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}
