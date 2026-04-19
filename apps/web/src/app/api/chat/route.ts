/**
 * POST /api/chat — intelligent conversational endpoint for Zara.
 *
 * 5-layer cost control:
 *   1. Local classifier — 70%+ of messages handled for $0
 *   2. Supabase response cache — repeat questions served for ~$0
 *   3. Anthropic prompt caching — 90% discount on cached reads
 *   4. Tiered models — Haiku for tool calls, Sonnet for reasoning
 *   5. Daily spend cap — silently falls back to rule-based path when hit
 *
 * Flow:
 *   classify → cache lookup → spend check → Claude (with tools) → cache write → stream
 *
 * Streams Server-Sent Events:
 *   event: text \n data: {"delta":"..."}      (prose chunks)
 *   event: tool_use \n data: {"name":"search_artists","status":"calling"}
 *   event: done \n data: {text, cards?, follow_up?, suggestions?, action?, sessionId, metadata}
 */
import type { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, TextBlock, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages';

import { classifyIntent, CANNED_RESPONSES } from '../../../lib/ai/intent-classifier';
import {
  hashKey,
  getCache,
  setCache,
  ttlForMessage,
  type ChatMessage,
  type CachedResponse,
} from '../../../lib/ai/response-cache';
import {
  checkAndReserve,
  recordActual,
  estimateCost,
  computeActualCost,
} from '../../../lib/ai/spend-guard';
import { SYSTEM_PROMPT } from '../../../lib/ai/system-prompt';
import { TOOLS } from '../../../lib/ai/tools';
import { runTool } from '../../../lib/ai/tool-handlers';

export const runtime = 'nodejs';
export const maxDuration = 30;

const AI_ENABLED = process.env.CHAT_AI_ENABLED === 'true' || process.env.NEXT_PUBLIC_CHAT_AI_ENABLED === 'true';

// ─── Form-fill system prompt (injected when surface='form') ──────
function buildFormSystemPrompt(formContext: { page: string; fields: Array<{ name: string; label: string; type: string; options?: string[] }> }): string {
  const fieldList = formContext.fields.map(f => {
    const opts = f.options ? ` (options: ${f.options.join(', ')})` : '';
    return `- ${f.name} (${f.label}, ${f.type}${opts})`;
  }).join('\n');

  return `You are Zara, GRID's AI concierge, helping a user fill out a ${formContext.page} by voice.

Available fields:
${fieldList}

Your job:
1. Greet the user warmly and ask what they're planning — ONE open question.
2. As they describe their event, extract field values from what they say.
3. Confirm extracted values naturally in your response (e.g. "Got it — wedding sangeet in Delhi, 300 guests.").
4. Ask for ONE missing critical field at a time (date or budget, whichever is more useful next).
5. When you've extracted one or more field values, include them in your response as a JSON block on the LAST line exactly like this:
   FIELDS:{"event_type":"wedding","city":"Delhi","budget_max":"300000"}

Rules:
- Keep responses SHORT (2-3 sentences max). They're spoken aloud.
- Use Indian English. "3L" not "three lakh rupees."
- date fields: output as YYYY-MM-DD if possible.
- number fields: output raw number (no ₹ symbol, no commas).
- Only output FIELDS: when you've extracted at least one new value.
- Never output FIELDS: if nothing new was extracted.
- If the form is complete, say so warmly and suggest they submit.`;
}
const PRIMARY_MODEL = 'claude-haiku-4-5';
const MAX_TOOL_TURNS = 3;

// ─── SSE helpers ──────────────────────────────────────────────
function sseLine(event: string, data: unknown): Uint8Array {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(payload);
}

function makeStream(): { readable: ReadableStream; write: (event: string, data: unknown) => void; close: () => void } {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const readable = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    readable,
    write: (event, data) => {
      try {
        controller.enqueue(sseLine(event, data));
      } catch {
        // Controller already closed (client disconnect) — ignore
      }
    },
    close: () => {
      try {
        controller.close();
      } catch {
        // Already closed
      }
    },
  };
}

// ─── Search API fallback (used by classifier shortcut + spend-cap fallback) ──

// Extract structured params from a freeform query string
function parseQueryToParams(raw: string): { q?: string; city?: string; genre?: string } {
  const lower = raw.toLowerCase();
  const ARTIST_TYPES = ['dj', 'djs', 'singer', 'singers', 'band', 'bands', 'comedian', 'dancer', 'rapper',
    'photographer', 'emcee', 'mc', 'musician', 'host'];
  const CITIES = ['mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'chennai', 'kolkata',
    'pune', 'ahmedabad', 'jaipur', 'lucknow', 'kochi', 'chandigarh', 'goa', 'gurgaon', 'noida',
    'indore', 'surat', 'nagpur', 'udaipur', 'jodhpur'];
  const GENRES = ['bollywood', 'punjabi', 'sufi', 'ghazal', 'classical', 'rock', 'jazz', 'edm',
    'electronic', 'hip hop', 'hip-hop', 'pop', 'folk', 'fusion', 'retro'];

  const params: { q?: string; city?: string; genre?: string } = {};
  const artistType = ARTIST_TYPES.find((t) => new RegExp(`\\b${t}s?\\b`, 'i').test(lower));
  if (artistType) params.q = artistType.replace(/s$/, '');
  const city = CITIES.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(lower));
  if (city) params.city = city.charAt(0).toUpperCase() + city.slice(1);
  const genre = GENRES.find((g) => new RegExp(`\\b${g.replace('-', '[- ]?')}\\b`, 'i').test(lower));
  if (genre) params.genre = genre;
  return params;
}

async function searchAndFormat(params: { q?: string; city?: string; genre?: string } | { q: string }): Promise<CachedResponse> {
  // If only a raw query string was passed, parse it into structured params
  const structured: { q?: string; city?: string; genre?: string } =
    'city' in params || 'genre' in params
      ? params
      : parseQueryToParams((params as { q: string }).q);

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'https://artist-booking-api.onrender.com';
  const url = new URL(`${apiBase}/v1/search/artists`);
  if (structured.q) url.searchParams.set('q', structured.q);
  if (structured.city) url.searchParams.set('city', structured.city);
  if (structured.genre) url.searchParams.set('genre', structured.genre);
  url.searchParams.set('per_page', '5');

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const body = (await res.json()) as { data?: { artists?: unknown[] } | unknown[]; meta?: { total?: number } };
    const artists = (Array.isArray(body.data) ? body.data : (body.data as { artists?: unknown[] })?.artists) as Array<{
      id?: string;
      stage_name?: string;
      artist_type?: string;
      base_city?: string;
      base_fee?: number;
    }> | undefined;

    if (!artists || artists.length === 0) {
      const what = structured.q ?? 'artist';
      const where = structured.city ? ` in ${structured.city}` : '';
      return {
        text: `I couldn't find ${what}s${where} right now — our catalog is growing daily. Tell me your event type, city, and rough budget and I'll get concierge to find the best fit.`,
        suggestions: ['Tell me about my event', 'Try a different city', 'Talk to concierge'],
        follow_up: {
          question: 'What type of event are you planning?',
          options: ['Wedding / Sangeet', 'Corporate event', 'Birthday party', 'College fest'],
        },
      };
    }

    const total = (body as { meta?: { total?: number } }).meta?.total ?? artists.length;
    const names = artists.slice(0, 3).map((a) => a.stage_name).filter(Boolean).join(', ');
    const where = structured.city ? ` in ${structured.city}` : '';
    const what = structured.q ?? 'artist';
    return {
      text: `Found ${total} ${what}${total === 1 ? '' : 's'}${where}. Top picks: ${names}.\n\nWhat's your budget and event date? I'll filter the best matches for you.`,
      suggestions: ['Show me all results', 'Filter by budget', 'Tell me about the first one'],
      follow_up: {
        question: 'What\'s your budget range?',
        options: ['Under ₹50k', '₹50k–₹1.5L', '₹1.5L–₹5L', '₹5L+'],
      },
    };
  } catch {
    return {
      text: "I'd love to help you find the right artist! Let me ask a few quick questions.\n\nWhat kind of event are you planning?",
      suggestions: ['Wedding / Sangeet', 'Corporate event', 'Birthday party', 'College fest'],
      follow_up: {
        question: 'What kind of event are you planning?',
        options: ['Wedding / Sangeet', 'Corporate event', 'Birthday party', 'College fest'],
      },
    };
  }
}

// ─── Main handler ─────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<Response> {
  let body: {
    messages?: ChatMessage[];
    sessionId?: string;
    surface?: 'hero' | 'voice' | 'form';
    formContext?: { page: string; fields: Array<{ name: string; label: string; type: string; options?: string[] }> };
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const messages = (body.messages ?? []).slice(-10); // cap history
  const surface = body.surface ?? 'hero';
  const sessionId = body.sessionId ?? crypto.randomUUID();
  const formContext = body.formContext;

  if (messages.length === 0) {
    return Response.json({ error: 'messages required' }, { status: 400 });
  }

  const lastUserMsg = messages[messages.length - 1];
  if (lastUserMsg.role !== 'user') {
    return Response.json({ error: 'last message must be user' }, { status: 400 });
  }

  const { readable, write, close } = makeStream();

  const response = new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });

  // Run the pipeline in the background; the stream is already returned
  void (async () => {
    try {
      await handleChat({ messages, userMsg: lastUserMsg.content, sessionId, surface, write, formContext });
    } catch (err) {
      // Graceful fallback: try a search-based response rather than a bare error
      const errMsg = err instanceof Error ? err.message : 'unknown';
      const isBillingError = errMsg.includes('credit balance') || errMsg.includes('400');
      if (isBillingError) {
        const fallback = await searchAndFormat(parseQueryToParams(lastUserMsg.content.slice(0, 120)));
        write('text', { delta: fallback.text });
        write('done', { ...fallback, sessionId, metadata: { layer: 'billing-fallback', costUsd: 0 } });
      } else {
        write('done', {
          text: "Something hiccupped on our end. Mind trying again?",
          sessionId,
          metadata: { error: errMsg },
        });
      }
    } finally {
      close();
    }
  })();

  return response;
}

async function handleChat(args: {
  messages: ChatMessage[];
  userMsg: string;
  sessionId: string;
  surface: 'hero' | 'voice' | 'form';
  write: (event: string, data: unknown) => void;
  formContext?: { page: string; fields: Array<{ name: string; label: string; type: string; options?: string[] }> };
}): Promise<void> {
  const { messages, userMsg, sessionId, surface, write, formContext } = args;
  const isFormFill = surface === 'form' && !!formContext;

  // ─── Layer 1: Local classifier ─────────────────────────────
  const intent = classifyIntent(userMsg);

  if (intent.handler === 'greeting') {
    const pick = CANNED_RESPONSES.greeting[Math.floor(Math.random() * CANNED_RESPONSES.greeting.length)];
    write('text', { delta: pick });
    write('done', {
      text: pick,
      suggestions: ['Plan a wedding sangeet', 'Find artists in my city', 'How does GRID work?'],
      sessionId,
      metadata: { layer: 'classifier:greeting', costUsd: 0 },
    });
    return;
  }

  if (intent.handler === 'faq') {
    const text = CANNED_RESPONSES.faq[intent.topic];
    write('text', { delta: text });
    write('done', {
      text,
      sessionId,
      metadata: { layer: `classifier:faq:${intent.topic}`, costUsd: 0 },
    });
    return;
  }

  if (intent.handler === 'navigate') {
    const text = `Taking you to ${intent.label}...`;
    write('text', { delta: text });
    write('done', {
      text,
      action: { type: 'navigate', route: intent.route, label: intent.label },
      sessionId,
      metadata: { layer: 'classifier:navigate', costUsd: 0 },
    });
    return;
  }

  if (intent.handler === 'search') {
    const result = await searchAndFormat(intent.params);
    write('text', { delta: result.text });
    write('done', { ...result, sessionId, metadata: { layer: 'classifier:search', costUsd: 0 } });
    return;
  }

  // ─── AI path ────────────────────────────────────────────────

  // Feature-flag check: if AI is off, fall back to search or a canned response
  if (!AI_ENABLED || !process.env.ANTHROPIC_API_KEY) {
    const fallback = await searchAndFormat({ q: userMsg.slice(0, 80) });
    write('text', { delta: fallback.text });
    write('done', { ...fallback, sessionId, metadata: { layer: 'ai-disabled-fallback', costUsd: 0 } });
    return;
  }

  // ─── Layer 2: Supabase response cache ──────────────────────
  const cacheKeyHash = hashKey({ messages });
  const cached = await getCache(cacheKeyHash);
  if (cached) {
    write('text', { delta: cached.text });
    write('done', { ...cached, sessionId, metadata: { layer: 'cache-hit', costUsd: 0 } });
    return;
  }

  // ─── Layer 5: Spend guard ──────────────────────────────────
  // Estimate ~3000 cached input + 500 new input + 400 output on average
  const estCost = estimateCost(PRIMARY_MODEL, 3500, 400);
  const guard = await checkAndReserve(estCost);
  if (!guard.allowed) {
    // Silently fall back to rule-based path
    const fallback = await searchAndFormat({ q: userMsg.slice(0, 80) });
    write('text', { delta: fallback.text });
    write('done', { ...fallback, sessionId, metadata: { layer: 'spend-cap-fallback', costUsd: 0 } });
    return;
  }

  // ─── Layer 3 + 4: Claude with tool loop + prompt caching ──
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const conversation: MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let totalActualCost = 0;
  let finalText = '';
  const toolsCalled: string[] = [];

  // Form-fill: single turn, no tools, custom system prompt
  if (isFormFill) {
    const resp = await anthropic.messages.create({
      model: PRIMARY_MODEL,
      max_tokens: 512,
      system: buildFormSystemPrompt(formContext!),
      messages: conversation,
    });
    totalActualCost += computeActualCost(PRIMARY_MODEL, resp.usage);
    const textBlocks = resp.content.filter((b): b is TextBlock => b.type === 'text');
    let rawText = textBlocks.map(b => b.text).join('');

    // Parse FIELDS: line and strip it from spoken text
    let extractedFields: Record<string, string> | undefined;
    const fieldsMatch = rawText.match(/\nFIELDS:(\{[^\n]+\})\s*$/);
    if (fieldsMatch) {
      try { extractedFields = JSON.parse(fieldsMatch[1]) as Record<string, string>; } catch { /* ignore */ }
      rawText = rawText.replace(/\nFIELDS:\{[^\n]+\}\s*$/, '').trim();
    }

    finalText = rawText;
    write('text', { delta: rawText });
    await recordActual(estCost, totalActualCost);
    write('done', {
      text: finalText,
      sessionId,
      action: extractedFields ? { type: 'fill_fields', fields: extractedFields } : undefined,
      metadata: { layer: 'ai-live:form', model: PRIMARY_MODEL, costUsd: Number(totalActualCost.toFixed(6)), surface },
    });
    return;
  }

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const resp = await anthropic.messages.create({
      model: PRIMARY_MODEL,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: TOOLS,
      messages: conversation,
    });

    totalActualCost += computeActualCost(PRIMARY_MODEL, resp.usage);

    const textBlocks = resp.content.filter((b): b is TextBlock => b.type === 'text');
    const toolUses = resp.content.filter((b): b is ToolUseBlock => b.type === 'tool_use');

    for (const tb of textBlocks) {
      if (tb.text) {
        write('text', { delta: tb.text });
        finalText += tb.text;
      }
    }

    if (resp.stop_reason === 'tool_use' && toolUses.length > 0) {
      conversation.push({ role: 'assistant', content: resp.content });
      const toolResults = await Promise.all(
        toolUses.map(async (tu) => {
          toolsCalled.push(tu.name);
          write('tool_use', { name: tu.name, status: 'calling' });
          const out = await runTool(tu.name, tu.input);
          write('tool_use', { name: tu.name, status: 'done' });
          return {
            type: 'tool_result' as const,
            tool_use_id: tu.id,
            content: JSON.stringify(out),
            is_error: !out.ok,
          };
        }),
      );
      conversation.push({ role: 'user', content: toolResults });
      continue;
    }
    break;
  }

  await recordActual(estCost, totalActualCost);

  const finalResponse: CachedResponse = {
    text: finalText || "Got it. What else?",
  };

  const ttl = ttlForMessage(userMsg);
  await setCache(cacheKeyHash, finalResponse, ttl, PRIMARY_MODEL);

  write('done', {
    ...finalResponse,
    sessionId,
    metadata: {
      layer: 'ai-live',
      model: PRIMARY_MODEL,
      costUsd: Number(totalActualCost.toFixed(6)),
      toolsCalled,
      surface,
    },
  });
}
