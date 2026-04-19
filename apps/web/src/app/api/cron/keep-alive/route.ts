/**
 * GET /api/cron/keep-alive
 *
 * Vercel Cron hits this every 5 min. We ping Render's /v1/health so the
 * free-tier dyno stays warm. Cold starts (30–60s) would otherwise
 * wreck Claude tool-call latency.
 *
 * Security: Vercel automatically injects an Authorization: Bearer <CRON_SECRET>
 * header on cron invocations. We verify it before fetching.
 */
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'https://artist-booking-api.onrender.com';

export async function GET(req: NextRequest): Promise<Response> {
  const authHeader = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;

  // Reject anyone hitting this manually without the secret
  if (process.env.CRON_SECRET && authHeader !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const start = Date.now();
  try {
    const res = await fetch(`${API_BASE}/v1/health`, {
      method: 'GET',
      headers: { 'User-Agent': 'grid-keep-alive/1.0' },
    });
    const ok = res.ok;
    const elapsed = Date.now() - start;
    return Response.json({
      ok,
      status: res.status,
      elapsed_ms: elapsed,
      target: `${API_BASE}/v1/health`,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        elapsed_ms: Date.now() - start,
        error: err instanceof Error ? err.message : 'fetch_failed',
      },
      { status: 502 },
    );
  }
}
