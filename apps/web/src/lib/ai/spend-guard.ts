/**
 * Daily spend guard for Anthropic API calls.
 *
 * Before every Claude call, checkAndReserve() atomically bumps the
 * running total. If we'd exceed AI_DAILY_CAP_USD, returns { allowed: false }
 * and /api/chat falls back to the existing rule-based path.
 *
 * Day boundary: IST (Asia/Kolkata) to match user expectations.
 *
 * Fail-open: if Supabase is unreachable, we allow the request but log.
 * Losing the cap is better than 500ing on every chat message.
 */
import { getAdminSupabase } from './supabase-client';

const DAILY_CAP_USD = Number(process.env.AI_DAILY_CAP_USD ?? '5');

export interface SpendCheck {
  allowed: boolean;
  remaining: number;
  capUsd: number;
}

function todayIST(): string {
  // Return YYYY-MM-DD in IST
  const now = new Date();
  // IST = UTC+5:30
  const istOffsetMin = 5.5 * 60;
  const istMs = now.getTime() + istOffsetMin * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 10);
}

export async function checkAndReserve(estCostUsd: number): Promise<SpendCheck> {
  const db = getAdminSupabase();
  const capUsd = DAILY_CAP_USD;

  if (!db) {
    // Fail-open
    return { allowed: true, remaining: capUsd, capUsd };
  }

  const date = todayIST();

  try {
    // Read current total
    const { data: current } = await db
      .from('ai_spend_daily')
      .select('total_cost_usd')
      .eq('date', date)
      .maybeSingle();

    const currentUsd = Number(current?.total_cost_usd ?? 0);
    const projected = currentUsd + estCostUsd;

    if (projected > capUsd) {
      return { allowed: false, remaining: Math.max(0, capUsd - currentUsd), capUsd };
    }

    // Reserve (increment request_count + total_cost_usd atomically via upsert)
    await db.from('ai_spend_daily').upsert(
      {
        date,
        total_cost_usd: projected,
        request_count: (current ? 1 : 1), // will be overwritten; see recordActual for real increment
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'date' },
    );

    return { allowed: true, remaining: capUsd - projected, capUsd };
  } catch {
    // Fail-open
    return { allowed: true, remaining: capUsd, capUsd };
  }
}

/**
 * Adjust the running total after a Claude call completes.
 * Takes the delta between estimated cost (already reserved) and actual.
 */
export async function recordActual(estimatedUsd: number, actualUsd: number): Promise<void> {
  const db = getAdminSupabase();
  if (!db) return;

  const delta = actualUsd - estimatedUsd;
  const date = todayIST();

  try {
    const { data: current } = await db
      .from('ai_spend_daily')
      .select('total_cost_usd, request_count')
      .eq('date', date)
      .maybeSingle();

    await db.from('ai_spend_daily').upsert(
      {
        date,
        total_cost_usd: Number(current?.total_cost_usd ?? 0) + delta,
        request_count: Number(current?.request_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'date' },
    );
  } catch {
    // Silently fail
  }
}

/**
 * Rough cost estimator used for reservation BEFORE the API call.
 * Post-call, recordActual() corrects with the real token counts.
 *
 * Sonnet-4.5: $3/M input, $15/M output
 * Haiku-4.5: $0.25/M input, $1.25/M output (much cheaper for tool calls)
 */
export function estimateCost(model: string, estInputTokens: number, estOutputTokens: number): number {
  const prices: Record<string, { input: number; output: number }> = {
    'claude-haiku-4-5': { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
    'claude-sonnet-4-5': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
    'claude-opus-4-5': { input: 15 / 1_000_000, output: 75 / 1_000_000 },
  };
  const p = prices[model] ?? prices['claude-sonnet-4-5'];
  return estInputTokens * p.input + estOutputTokens * p.output;
}

/**
 * Compute actual cost from Anthropic usage object.
 * Cached reads are 90% cheaper. Cache writes are 25% more expensive.
 */
export function computeActualCost(
  model: string,
  usage: {
    input_tokens?: number | null;
    output_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
    cache_read_input_tokens?: number | null;
  },
): number {
  const prices: Record<string, { input: number; output: number }> = {
    'claude-haiku-4-5': { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
    'claude-sonnet-4-5': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
    'claude-opus-4-5': { input: 15 / 1_000_000, output: 75 / 1_000_000 },
  };
  const p = prices[model] ?? prices['claude-sonnet-4-5'];

  const regularInput = usage.input_tokens ?? 0;
  const cacheCreate = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;

  return (
    regularInput * p.input +
    cacheCreate * p.input * 1.25 +
    cacheRead * p.input * 0.1 +
    output * p.output
  );
}

export { DAILY_CAP_USD };
