/**
 * Tool handler implementations.
 *
 * Each handler wraps an existing GRID backend endpoint. Claude invokes
 * a tool by name; we route to the matching handler here and feed the
 * result back into the conversation as a tool_result content block.
 *
 * All handlers have a 25s timeout — Render free tier can be slow on
 * cold start. On error, return a small error object; Claude is prompted
 * to recover gracefully ("tool failed, let me try another approach").
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'https://artist-booking-api.onrender.com';

const TOOL_TIMEOUT_MS = 25_000;

async function timedFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOOL_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

function buildSearchUrl(input: {
  q?: string;
  city?: string;
  genre?: string;
  budget_min_paise?: number;
  budget_max_paise?: number;
}): string {
  const params = new URLSearchParams();
  if (input.q) params.set('q', input.q);
  if (input.city) params.set('city', input.city);
  if (input.genre) params.set('genre', input.genre);
  if (input.budget_min_paise) params.set('budget_min_paise', String(input.budget_min_paise));
  if (input.budget_max_paise) params.set('budget_max_paise', String(input.budget_max_paise));
  params.set('per_page', '5');
  return `${API_BASE}/v1/search/artists?${params.toString()}`;
}

async function searchArtists(input: Record<string, unknown>): Promise<ToolResult> {
  try {
    const url = buildSearchUrl(input as Parameters<typeof buildSearchUrl>[0]);
    const res = await timedFetch(url);
    if (!res.ok) return { ok: false, error: `search_artists returned ${res.status}` };
    const body = (await res.json()) as { data?: { artists?: unknown[] } | unknown[] };
    // API returns either { data: { artists: [...] } } or { data: [...] }
    const artists = Array.isArray(body.data)
      ? body.data
      : (body.data as { artists?: unknown[] })?.artists ?? [];
    // Strip to 5 + essential fields only to save input tokens on next turn
    const compact = (artists as Array<Record<string, unknown>>).slice(0, 5).map((a) => ({
      id: a.id,
      stage_name: a.stage_name ?? a.name,
      artist_type: a.artist_type,
      base_city: a.base_city ?? a.city,
      price_min_paise: a.price_min_paise ?? a.price_min,
      price_max_paise: a.price_max_paise ?? a.price_max,
      trust_score: a.trust_score,
      genres: a.genres,
    }));
    return { ok: true, data: { count: compact.length, artists: compact } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'search_artists failed' };
  }
}

async function parseBrief(input: Record<string, unknown>): Promise<ToolResult> {
  try {
    const raw = String(input.raw_text ?? '');
    const res = await timedFetch(`${API_BASE}/v1/decision-engine/brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text: raw, source: 'ai_assistant' }),
    });
    if (!res.ok) return { ok: false, error: `parse_brief returned ${res.status}` };
    const body = (await res.json()) as { success?: boolean; data?: unknown };
    if (!body.success) return { ok: false, error: 'parse_brief: no success' };

    // Compact the response — Claude doesn't need the full kitchen sink
    const d = body.data as {
      session_id?: string;
      response_type?: string;
      response_text?: string;
      clarifying_questions?: unknown[];
      recommendations?: Array<Record<string, unknown>>;
      parsed_context?: unknown;
    };

    return {
      ok: true,
      data: {
        response_type: d.response_type,
        session_id: d.session_id,
        response_text: d.response_text,
        clarifying_questions: d.clarifying_questions,
        parsed_context: d.parsed_context,
        recommendations: (d.recommendations ?? []).slice(0, 5).map((r) => ({
          artist_id: r.artist_id,
          artist_name: r.artist_name,
          artist_type: r.artist_type,
          score: r.score,
          price_min_paise: r.price_min_paise,
          price_max_paise: r.price_max_paise,
          why_fit: r.why_fit,
          risk_flags: r.risk_flags,
        })),
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'parse_brief failed' };
  }
}

async function getArtistDetails(input: Record<string, unknown>): Promise<ToolResult> {
  try {
    const id = String(input.artist_id ?? '');
    if (!id) return { ok: false, error: 'artist_id required' };
    const res = await timedFetch(`${API_BASE}/v1/artists/${encodeURIComponent(id)}`);
    if (!res.ok) return { ok: false, error: `get_artist_details returned ${res.status}` };
    const body = (await res.json()) as { data?: Record<string, unknown> };
    const a = body.data ?? {};
    return {
      ok: true,
      data: {
        id: a.id,
        stage_name: a.stage_name,
        bio: a.bio,
        artist_type: a.artist_type,
        base_city: a.base_city,
        genres: a.genres,
        price_min_paise: a.price_min_paise,
        price_max_paise: a.price_max_paise,
        trust_score: a.trust_score,
        review_count: a.review_count,
        rating_avg: a.rating_avg,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'get_artist_details failed' };
  }
}

async function getPricingGuide(input: Record<string, unknown>): Promise<ToolResult> {
  try {
    const params = new URLSearchParams();
    if (input.category) params.set('category', String(input.category));
    if (input.city) params.set('city', String(input.city));
    if (input.event_type) params.set('event_type', String(input.event_type));
    const res = await timedFetch(`${API_BASE}/v1/pricing-brain/guide?${params.toString()}`);
    if (!res.ok) {
      // pricing-brain endpoint may not exist yet — return a graceful fallback
      return {
        ok: true,
        data: {
          note: 'Live pricing guide unavailable. Use your general market knowledge from the system prompt to provide range-based guidance.',
          category: input.category,
          city: input.city,
        },
      };
    }
    return { ok: true, data: await res.json() };
  } catch {
    return {
      ok: true,
      data: {
        note: 'Live pricing guide unavailable. Use your general market knowledge from the system prompt to provide range-based guidance.',
      },
    };
  }
}

export async function runTool(name: string, input: unknown): Promise<ToolResult> {
  const safeInput = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  switch (name) {
    case 'search_artists':
      return searchArtists(safeInput);
    case 'parse_brief':
      return parseBrief(safeInput);
    case 'get_artist_details':
      return getArtistDetails(safeInput);
    case 'get_pricing_guide':
      return getPricingGuide(safeInput);
    default:
      return { ok: false, error: `unknown tool: ${name}` };
  }
}
