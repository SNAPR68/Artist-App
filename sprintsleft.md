# Remaining Sprints: 4, 5, 6

**Sprints 1-3 are DONE.** Current score: ~85/100.

This document contains executable instructions for Claude Co-Work to complete Sprints 4, 5, and 6. Each sprint is self-contained — run them in order.

---

## Sprint 4: "Monitoring & Observability" (85 → 90)

### 4.1 Add Redis caching to artist profile endpoint
**File:** `apps/api/src/modules/artist/artist.service.ts`
- Import Redis from `../../infrastructure/redis.js`
- In `getPublicProfile(artistId)`: check Redis key `artist:profile:${artistId}` first
- If cache hit, return cached data
- If cache miss, query DB, store in Redis with 300s TTL (5 min), return
- In `updateProfile()`: delete cache key `artist:profile:${artistId}` after update

### 4.2 Improve search caching
**File:** `apps/api/src/modules/search/search.service.ts`
- Search already has 2-min Redis cache — verify cache key uses sorted JSON keys to prevent collisions
- Replace `JSON.stringify(params)` with sorted key approach: `Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')`

### 4.3 Database query timeout + slow query logging
**File:** `apps/api/src/infrastructure/database.ts`
- Add `afterCreate` hook to Knex pool config:
```typescript
afterCreate: (conn: any, done: Function) => {
  conn.query('SET statement_timeout = 30000', (err: any) => done(err, conn));
}
```
- Add query event listener for slow queries:
```typescript
db.on('query', (query) => {
  (query as any).__startTime = Date.now();
});
db.on('query-response', (_response, query) => {
  const duration = Date.now() - (query as any).__startTime;
  if (duration > 1000) {
    console.warn(`[SLOW QUERY] ${duration}ms: ${query.sql?.substring(0, 200)}`);
  }
});
```

### 4.4 Add Cache-Control headers for public API responses
**File:** `apps/api/src/modules/search/search.routes.ts`
- On search response: `reply.header('Cache-Control', 'public, max-age=120, s-maxage=120')`

**File:** `apps/api/src/modules/artist/artist.routes.ts`
- On public profile response: `reply.header('Cache-Control', 'public, max-age=300, s-maxage=300')`

### 4.5 Build and deploy
```bash
cd apps/api && npx tsc -p tsconfig.build.json && npx tsc-alias -p tsconfig.build.json
git add -A && git commit -m "Sprint 4: Monitoring, caching, query timeouts"
git push origin main
npx vercel --prod --yes
```

### User action items (not code):
- Set up BetterStack uptime monitoring for API (`https://artist-booking-api.onrender.com/health`) and Web (`https://artist-booking-web.vercel.app`)
- Set up Axiom/Logtail log drain on Render

---

## Sprint 5: "SEO, Content & Polish" (90 → 95)

### 5.1 Dynamic metadata per page
**File:** `apps/web/src/app/artists/[id]/page.tsx`
- Add `generateMetadata()` export:
```typescript
export async function generateMetadata({ params }: { params: { id: string } }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/artists/${params.id}/public`);
  const data = await res.json().catch(() => null);
  const artist = data?.data;
  return {
    title: artist ? `${artist.stage_name} | Artist Booking` : 'Artist | Artist Booking',
    description: artist?.bio?.substring(0, 160) || 'Book live entertainment for your event',
    openGraph: {
      title: artist?.stage_name,
      description: artist?.bio?.substring(0, 160),
      images: artist?.profile_image ? [{ url: artist.profile_image }] : [],
      type: 'profile',
    },
    twitter: { card: 'summary_large_image' },
  };
}
```

**File:** `apps/web/src/app/search/page.tsx`
- Add metadata:
```typescript
export const metadata = {
  title: 'Find Artists | Artist Booking',
  description: 'Search and book live entertainment artists for your event in India',
  openGraph: { title: 'Find Artists', description: 'Search and book live entertainment' },
};
```

### 5.2 Sitemap
**File:** new `apps/web/src/app/sitemap.ts`
```typescript
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://artist-booking-web.vercel.app';

  // Static pages
  const staticPages = ['', '/search', '/about', '/privacy', '/terms'].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Dynamic artist pages
  let artistPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/search/artists?per_page=200`);
    const data = await res.json();
    artistPages = (data?.data?.artists || []).map((a: any) => ({
      url: `${baseUrl}/artists/${a.id}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));
  } catch {}

  return [...staticPages, ...artistPages];
}
```

### 5.3 robots.txt
**File:** new `apps/web/src/app/robots.ts`
```typescript
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard/', '/admin/'] },
    sitemap: 'https://artist-booking-web.vercel.app/sitemap.xml',
  };
}
```

### 5.4 Custom 404 page
**File:** `apps/web/src/app/not-found.tsx`
```typescript
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-6">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page not found</p>
        <div className="space-x-4">
          <Link href="/" className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Go Home
          </Link>
          <Link href="/search" className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
            Search Artists
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### 5.5 Custom error page
**File:** `apps/web/src/app/error.tsx`
```typescript
'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-6">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">500</h1>
        <p className="text-xl text-gray-600 mb-8">Something went wrong</p>
        <button onClick={reset} className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          Try Again
        </button>
      </div>
    </div>
  );
}
```

### 5.6 Build and deploy
```bash
pnpm turbo build
git add -A && git commit -m "Sprint 5: SEO, sitemap, error pages, OG tags"
git push origin main
npx vercel --prod --yes
```

### User action items (not code):
- Seed 50+ real artist profiles with photos, bios, genres, pricing
- Test on iPhone Safari + Android Chrome
- Test PWA install flow on both platforms

---

## Sprint 6: "Production Hardening" (95 → 100)

### 6.1 Smoke tests in CI
**File:** `.github/workflows/deploy-production.yml`
- Add post-deploy step:
```yaml
  smoke-test:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Health check API
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://artist-booking-api.onrender.com/health)
          if [ "$STATUS" != "200" ]; then echo "API health check failed: $STATUS"; exit 1; fi
      - name: Health check Web
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://artist-booking-web.vercel.app)
          if [ "$STATUS" != "200" ]; then echo "Web health check failed: $STATUS"; exit 1; fi
      - name: Search endpoint check
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://artist-booking-api.onrender.com/v1/search/artists)
          if [ "$STATUS" != "200" ]; then echo "Search check failed: $STATUS"; exit 1; fi
```

### 6.2 Cookie consent banner
**File:** new `apps/web/src/components/CookieConsent.tsx`
- Simple banner at bottom of page
- "Accept" button sets localStorage flag
- "Decline" disables PostHog analytics
- Import in `apps/web/src/app/layout.tsx`

### 6.3 GDPR data deletion endpoint
**File:** `apps/api/src/modules/auth/auth.routes.ts`
- Add `DELETE /v1/auth/account` (requires auth)
- Soft-delete: set `users.deleted_at = NOW()`, anonymize PII fields
- Revoke all tokens
- Return confirmation

### 6.4 API documentation (Swagger)
**File:** `apps/api/src/app.ts`
- Install `@fastify/swagger` and `@fastify/swagger-ui`
- Register swagger plugin with API info
- Serve docs at `/docs`

### 6.5 PostHog feature flags setup
**File:** `apps/web/src/lib/analytics.ts`
- Add `posthog.isFeatureEnabled('feature-name')` wrapper
- Create example flag in PostHog dashboard
- Gate one feature behind flag as proof of concept

### 6.6 Build and deploy
```bash
pnpm turbo build
git add -A && git commit -m "Sprint 6: Smoke tests, GDPR, cookies, API docs, feature flags"
git push origin main
npx vercel --prod --yes
```

### User action items (not code):
- Have a lawyer review privacy policy + terms of service pages
- Verify Supabase backup schedule (Settings → Database → Backups)
- Create staging API instance on Render (separate service)
- Run load testing with k6 against staging (not production)
- Set up Slack notifications for Sentry alerts + deploy status

---

## Summary

| Sprint | Score | Status | What it does |
|--------|-------|--------|-------------|
| 1 | 52→70 | ✅ DONE | OTP security, Sentry, rate limiting |
| 2 | 70→80 | ✅ DONE | Refund webhooks, reconciliation, mock mode gating |
| 3 | 80→85 | ✅ DONE | JWT TTLs, XSS sanitization, body limits |
| 4 | 85→90 | 🔄 NEXT | Redis caching, query timeouts, Cache-Control headers |
| 5 | 90→95 | ⏳ PENDING | SEO/OG tags, sitemap, 404/500 pages |
| 6 | 95→100 | ⏳ PENDING | Smoke tests, GDPR, cookies, API docs, feature flags |

**Instructions for Claude Co-Work:** Execute each sprint in order. After each sprint, run `turbo build` to verify, then commit and deploy. Each sprint is independent — if one task fails, skip it and continue.
