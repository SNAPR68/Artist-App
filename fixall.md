# Fix All: Critical, High & Medium Issues

Execute every fix below in order. After all fixes, run `pnpm turbo build` to verify. Then deploy API to Render and web to Vercel.

---

## CRITICAL 1: DB SSL verification disabled

**File:** `apps/api/src/infrastructure/database.ts`

Line 28 — change:
```typescript
ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
```
To:
```typescript
ssl: config.NODE_ENV === 'production' ? true : false,
```

Same file, lines 30-38 — replace the entire pool + acquireConnectionTimeout block:
```typescript
pool: {
  min: config.DATABASE_POOL_MIN ?? 5,
  max: config.DATABASE_POOL_MAX ?? 20,
  idleTimeoutMillis: 30000,
  afterCreate: (conn: any, done: Function) => {
    conn.query('SET statement_timeout = 30000', (err: any) => {
      if (err) return done(err, conn);
      conn.query('SET idle_in_transaction_session_timeout = 60000', (err2: any) => done(err2, conn));
    });
  },
},
acquireConnectionTimeout: 5_000,
```

Same file, lines 42-52 — remove the `if (config.NODE_ENV === 'production')` guard around slow query logging. Enable it in ALL environments:
```typescript
// Slow query logging (> 1 second) — all environments
db.on('query', (query: any) => {
  query.__startTime = Date.now();
});
db.on('query-response', (_response: any, query: any) => {
  const duration = Date.now() - (query.__startTime || Date.now());
  if (duration > 1000) {
    console.warn(`[SLOW QUERY] ${duration}ms: ${(query.sql || '').substring(0, 200)}`);
  }
});
```

---

## CRITICAL 2: OTP bypass env var mismatch

**File:** `apps/api/src/modules/auth/otp.service.ts`

Add import at top (after existing imports):
```typescript
import { config } from '../../config/index.js';
```

Line 58 — change:
```typescript
if (otp === '123456' && process.env.ALLOW_TEST_OTP === 'true') {
```
To:
```typescript
if (otp === '123456' && config.OTP_BYPASS_ENABLED === true) {
```

**File:** `apps/api/src/config/index.ts`

Find the Zod config schema object. Add this field:
```typescript
OTP_BYPASS_ENABLED: z.preprocess((v) => v === 'true', z.boolean()).default(false),
```

---

## HIGH 1: Payment idempotency — add FOR UPDATE lock

**File:** `apps/api/src/modules/payment/payment.service.ts`

Find the method that creates a payment order (likely `initiatePayment` or `createOrder`). Inside the transaction, BEFORE inserting a new payment row, add:
```typescript
const existingPayment = await trx('payments')
  .where({ booking_id: bookingId, status: 'pending' })
  .forUpdate()
  .first();
if (existingPayment) return existingPayment;
```

---

## HIGH 2: Double-spend check on payment verification

**File:** `apps/api/src/modules/payment/payment.service.ts`

Find the `verifyPayment` method. After fetching the payment record and before updating status, add:
```typescript
if (payment.status !== 'pending') {
  return { success: true, message: 'Payment already verified', payment };
}
```

---

## HIGH 3: Webhook signature validation in ALL environments

**File:** `apps/api/src/modules/payment/payment.routes.ts`

Find the block that skips webhook validation in non-production:
```typescript
if (process.env.NODE_ENV !== 'production') {
  return;
}
```
DELETE that entire if-block. Always validate webhook signatures regardless of environment.

---

## HIGH 4: Rate limiter IP detection — respect X-Forwarded-For

**File:** `apps/api/src/middleware/rate-limiter.middleware.ts`

Find the line:
```typescript
const identifier = request.user?.user_id ?? request.ip;
```
Replace with:
```typescript
const identifier = request.user?.user_id ?? (request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || request.ip);
```

---

## HIGH 5: Token revocation inside account deletion transaction

**File:** `apps/api/src/modules/auth/auth.routes.ts`

Find the `DELETE /v1/auth/account` endpoint. Move the Redis token cleanup (any `redis.del` calls for refresh tokens or token blacklisting) INSIDE the database transaction block, BEFORE the transaction commits. If the Redis call fails, the transaction should roll back.

---

## HIGH 6: RBAC permission name fix

**File:** `apps/api/src/modules/payment/payment.routes.ts`

Find all occurrences of `'admin:manage'` and replace with `'admin:payments'`. Use find-and-replace across the file.

---

## HIGH 7: Error handler — never leak stack traces

**File:** `apps/api/src/middleware/error-handler.middleware.ts`

Find where the 500 error message checks `config.NODE_ENV === 'production'`:
```typescript
message: config.NODE_ENV === 'production'
  ? 'An internal error occurred'
  : error.message || 'Unknown error',
```
Change to always return generic message:
```typescript
message: 'An internal error occurred',
```
The full error is already logged server-side via `request.log.error(error)` — keep that.

---

## HIGH 8: JWT access token expiry too long

**File:** `apps/api/src/config/index.ts`

Find `JWT_ACCESS_TOKEN_EXPIRY` default. If it defaults to `'24h'`, change to `'1h'`. The refresh token flow handles renewal.

---

## HIGH 9: Add fetch timeout to frontend apiClient

**File:** `apps/web/src/lib/api-client.ts`

In the `apiClient` function, before the first fetch call, add:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);
```

Add `signal: controller.signal` to the fetch options object:
```typescript
response = await fetch(url, { ...options, headers, signal: controller.signal });
```

After each fetch (in the try block), add:
```typescript
clearTimeout(timeoutId);
```

In the catch block, handle AbortError:
```typescript
} catch (err) {
  clearTimeout(timeoutId);
  const message = err instanceof Error
    ? (err.name === 'AbortError' ? 'Request timed out' : err.message)
    : 'Network error';
  console.error(`[apiClient] fetch failed: ${url}`, err);
  return { success: false, data: {} as T, errors: [{ code: 'NETWORK_ERROR', message }] } as ApiResponse<T>;
}
```

Do the same for the retry fetch inside the 401 refresh block.

---

## HIGH 10: Add ErrorBoundary to dashboard pages

**File:** `apps/web/src/app/(dashboard)/admin/page.tsx`

Add import at top:
```typescript
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
```

Wrap the main returned JSX in `<ErrorBoundary>...</ErrorBoundary>`.

Do the same for:
- `apps/web/src/app/(dashboard)/artist/page.tsx`
- `apps/web/src/app/(dashboard)/client/workspace/[id]/analytics/page.tsx`

If `ErrorBoundary` doesn't exist at that path, find where it's exported from and use the correct import.

---

## HIGH 11: Fix Promise.all silent failures

**File:** `apps/web/src/app/(public)/artists/[id]/ArtistPageClient.tsx`

Find any `Promise.all()` calls. Wrap in try/catch:
```typescript
try {
  const [res1, res2] = await Promise.all([...]);
  // handle results
} catch (err) {
  console.error('[ArtistPage] Failed to load data:', err);
  setError('Failed to load artist profile. Please try again.');
}
```

Add `const [error, setError] = useState<string | null>(null);` to state declarations.
Show error UI when error is set.

---

## HIGH 12: Fix non-null assertions on artist profile

**File:** `apps/web/src/app/(dashboard)/artist/page.tsx`

Find all `profile!.` (non-null assertion) and replace with optional chaining + fallback:
- `profile!.stage_name` → `profile?.stage_name ?? ''`
- `profile!.bio` → `profile?.bio ?? ''`
- `profile!.genres` → `profile?.genres ?? []`
- `profile!.base_city` → `profile?.base_city ?? ''`
- `profile!.pricing` → `profile?.pricing ?? []`
- `profile!.is_verified` → `profile?.is_verified ?? false`
- `profile!.trust_score` → `profile?.trust_score ?? '0'`

Apply this pattern to ALL `!.` usages in the file.

---

## MEDIUM 1: Missing CSRF note

No code change needed — Fastify with Bearer token auth is not vulnerable to CSRF since browsers don't auto-attach Authorization headers. Document this in CLAUDE.md if desired.

---

## MEDIUM 2: Rate limiter Redis fallback

**File:** `apps/api/src/middleware/rate-limiter.middleware.ts`

Find where it returns 429 when Redis is unreachable:
```typescript
if (!results) {
  return reply.status(429).send({...});
}
```
Change to fail-open with warning:
```typescript
if (!results) {
  request.log.warn('[RATELIMIT] Redis unreachable, allowing request');
  return;
}
```

---

## MEDIUM 3: Add aria-labels to search components

**File:** `apps/web/src/components/search/SearchBar.tsx`

Add `aria-label="Search for artists"` to the `<input>` element.
Add `aria-label="Submit search"` to the search `<button>`.

**File:** `apps/web/src/components/search/FilterSidebar.tsx`

Add `aria-label="Clear all filters"` to the clear filters button.
Add `role="group"` and `aria-label="Genre filters"` to the genre filter container.
Add `role="group"` and `aria-label="City filters"` to the city filter container.

---

## MEDIUM 4: Fix Navbar timer memory leak

Find the Navbar component (likely `apps/web/src/components/layout/Navbar.tsx` or `apps/web/src/components/navigation/`).

Find `setTimeout` in `handleCloseDrawer` or similar. Store the timeout ID:
```typescript
const timerRef = useRef<NodeJS.Timeout | null>(null);

const handleCloseDrawer = () => {
  timerRef.current = setTimeout(() => {
    setDrawerOpen(false);
  }, 300);
};

useEffect(() => {
  return () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };
}, []);
```

---

## MEDIUM 5: Add useMemo to admin filtered data

**File:** `apps/web/src/app/(dashboard)/admin/page.tsx`

Find `filteredBookings` or any `.filter()` call on state arrays. Wrap in useMemo:
```typescript
const filteredBookings = useMemo(
  () => bookings.filter(b => !statusFilter || b.status === statusFilter),
  [bookings, statusFilter]
);
```

Import useMemo if not already imported.

---

## MEDIUM 6: RBAC undefined permission

Already covered in HIGH 6 above (`admin:manage` → `admin:payments`).

---

## MEDIUM 7: Settlement payout outside transaction

**File:** `apps/api/src/modules/payment/payment.service.ts`

Find the settlement method. The payout creation call after the transaction:
```typescript
try {
  await payoutService.createPayout(result.id);
} catch (err) {
  console.error(`[SETTLEMENT] Failed to create payout...`);
}
```

Move this INSIDE the transaction. If payout creation fails, log but don't roll back (payout is a separate concern):
```typescript
const result = await db.transaction(async (trx) => {
  // ... existing settlement updates ...

  // Create payout record (non-blocking — logged if fails)
  try {
    await payoutService.createPayout(settlementResult.id, trx);
  } catch (err) {
    console.error(`[SETTLEMENT] Payout record failed, will retry:`, err);
  }

  return settlementResult;
});
```

---

## MEDIUM 8: Connection pooler URL hardcodes region

**File:** `apps/api/src/infrastructure/database.ts`

In `getConnectionUrl`, change the hardcoded pooler host to use an env var:
```typescript
function getConnectionUrl(url: string): string {
  const poolerHost = process.env.SUPABASE_POOLER_HOST || 'aws-1-ap-southeast-2.pooler.supabase.com';
  const match = url.match(/db\.([a-z0-9]+)\.supabase\.co/);
  if (match) {
    const rewritten = url.replace(
      `db.${match[1]}.supabase.co`,
      poolerHost
    ).replace(
      /postgresql:\/\/postgres:/,
      `postgresql://postgres.${match[1]}:`
    );
    console.log(`[database] Rewrote direct connection to session pooler`);
    return rewritten;
  }
  return url;
}
```

---

## MEDIUM 9: Missing env var validation for production

**File:** `apps/api/src/config/index.ts`

Leave payment/SMS keys as optional (they have graceful fallbacks). But add a startup warning:
```typescript
if (config.NODE_ENV === 'production') {
  const missing: string[] = [];
  if (!config.RAZORPAY_KEY_ID) missing.push('RAZORPAY_KEY_ID');
  if (!config.MSG91_AUTH_KEY) missing.push('MSG91_AUTH_KEY');
  if (!config.SENTRY_DSN) missing.push('SENTRY_DSN');
  if (missing.length > 0) {
    console.warn(`[CONFIG] Missing recommended production env vars: ${missing.join(', ')}`);
  }
}
```

Add this AFTER the config is parsed, at the bottom of the file before the export.

---

## After all fixes

```bash
# Type-check API
cd apps/api && npx tsc -p tsconfig.build.json --noEmit

# Build web
cd ../.. && pnpm turbo build --filter=@artist-booking/web

# If both pass, deploy:
npx vercel --prod --yes
git add -A && git commit -m "Fix all critical, high, and medium security/quality issues"
git push origin main
```
