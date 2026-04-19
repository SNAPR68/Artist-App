/**
 * Response cache for AI chat.
 *
 * Key: sha256(system_prompt_version + JSON(last-3-turns + userMsg))
 * Value: the full response envelope (text + cards + follow_up + etc.)
 *
 * TTL policy:
 *  - 1 hour for time-sensitive queries (mentions "today", "now", "available", etc.)
 *  - 30 days for generic queries
 *
 * If Supabase is unreachable or env vars missing, returns null → /api/chat
 * degrades to live Claude calls (no cache, but still works).
 */
import crypto from 'node:crypto';
import { getAdminSupabase } from './supabase-client';

export const SYSTEM_PROMPT_VERSION = 'v1.2026-04-17';

export interface CachedResponse {
  text: string;
  cards?: unknown;
  follow_up?: unknown;
  suggestions?: string[];
  action?: unknown;
  messages?: { role: string; content: string }[]; // for collision verification
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Deterministic hash for cache key. */
export function hashKey(input: { messages: ChatMessage[] }): string {
  const payload = JSON.stringify({
    v: SYSTEM_PROMPT_VERSION,
    messages: input.messages.slice(-3), // last 3 turns = enough context
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

const TIME_SENSITIVE = /\b(today|tonight|tomorrow|this weekend|available now|right now|currently|live)\b/i;

export function ttlForMessage(text: string): number {
  return TIME_SENSITIVE.test(text) ? 3600 : 30 * 24 * 3600;
}

export async function getCache(hash: string): Promise<CachedResponse | null> {
  const db = getAdminSupabase();
  if (!db) return null;

  try {
    const { data, error } = await db
      .from('ai_response_cache')
      .select('response, expires_at, hit_count')
      .eq('hash', hash)
      .maybeSingle();

    if (error || !data) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;

    // Increment hit count (fire and forget)
    void db
      .from('ai_response_cache')
      .update({ hit_count: (data.hit_count ?? 0) + 1 })
      .eq('hash', hash);

    return data.response as CachedResponse;
  } catch {
    return null;
  }
}

export async function setCache(
  hash: string,
  response: CachedResponse,
  ttlSeconds: number,
  model: string,
): Promise<void> {
  const db = getAdminSupabase();
  if (!db) return;

  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await db.from('ai_response_cache').upsert({
      hash,
      response,
      model,
      expires_at: expiresAt,
      hit_count: 0,
    });
  } catch {
    // Degrade silently — cache write failure shouldn't break the request
  }
}
