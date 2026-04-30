import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  API_BASE_URL: z.string().default('http://localhost:3001'),
  WEB_BASE_URL: z.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string(),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // OpenSearch
  OPENSEARCH_URL: z.string().default('http://localhost:9200'),

  // Storage (Supabase Storage — S3-compatible)
  STORAGE_REGION: z.string().default('ap-south-1'),
  STORAGE_ENDPOINT: z.string().default('http://localhost:4566'),
  STORAGE_ACCESS_KEY: z.string().default('test'),
  STORAGE_SECRET_KEY: z.string().default('test'),
  S3_BUCKET_MEDIA: z.string().default('artist-booking-media'),
  S3_BUCKET_DOCUMENTS: z.string().default('artist-booking-documents'),

  // CDN / Public URL for media
  CDN_BASE_URL: z.string().default('http://localhost:4566/artist-booking-media'),

  // Supabase
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),

  // JWT
  JWT_PRIVATE_KEY_PATH: z.string().optional(),
  JWT_PUBLIC_KEY_PATH: z.string().optional(),
  JWT_ACCESS_TOKEN_EXPIRY: z.string().default('1h'),
  JWT_REFRESH_TOKEN_EXPIRY: z.string().default('30d'),

  // PII Encryption
  PII_ENCRYPTION_KEY: z.string().min(32),

  // Google Calendar OAuth (2-way sync — moat #1)
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().optional(),

  // Instagram (Meta) OAuth — IG Business API via Facebook Login
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  INSTAGRAM_OAUTH_REDIRECT_URI: z.string().optional(),
  PUBLIC_API_URL: z.string().optional(),
  PUBLIC_WEB_URL: z.string().optional(),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_MOCK_MODE: z.string().default('false'), // Set 'true' only in dev/staging

  // MSG91
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().default('ARTBKNG'),
  MSG91_OTP_TEMPLATE_ID: z.string().optional(),

  // Gupshup (WhatsApp)
  GUPSHUP_API_KEY: z.string().optional(),
  GUPSHUP_USERID: z.string().optional(),
  GUPSHUP_PASSWORD: z.string().optional(),
  GUPSHUP_APP_NAME: z.string().optional(),
  GUPSHUP_SOURCE_NUMBER: z.string().optional(),

  // Firebase
  FIREBASE_PROJECT_ID: z.string().optional(),

  // Resend (Email)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Artist Booking <noreply@artistbooking.in>'),

  // Slack webhook for pilot lead notifications (sprint FINAL D6.3).
  // Optional: when unset, pilot submissions still persist — only the Slack
  // ping is skipped. Channel recommended: #grid-pilot-leads.
  SLACK_PILOT_WEBHOOK_URL: z.string().url().optional(),

  // OTP Bypass (only enable in dev/staging, NEVER in production)
  OTP_BYPASS_ENABLED: z.string().default('false'),

  // Sentry
  SENTRY_DSN: z.string().optional(),
  SENTRY_RELEASE: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Monitoring & Observability
  DATADOG_API_KEY: z.string().optional(),
  DATADOG_SITE: z.string().default('datadoghq.com'),
  PROMETHEUS_METRICS_PORT: z.coerce.number().default(9090),
  PROMETHEUS_SCRAPE_INTERVAL: z.string().default('15s'),

  // Monitoring Dashboards (read-only URLs)
  DATADOG_DASHBOARD_URL: z.string().optional(),
  PROMETHEUS_DASHBOARD_URL: z.string().optional(),
  GRAFANA_DASHBOARD_URL: z.string().optional(),
  APM_DASHBOARD_URL: z.string().optional(),
  STATUS_PAGE_URL: z.string().optional(),

  // Performance Monitoring
  NEWRELIC_LICENSE_KEY: z.string().optional(),
  NEWRELIC_APP_ID: z.string().optional(),

  // Error Tracking (already have SENTRY_DSN)
  ERROR_TRACKING_ENABLED: z.string().default('true'),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const message = `Invalid environment variables:\n${JSON.stringify(result.error.format(), null, 2)}`;
    // In test context, throw so tests can catch config errors instead of killing the process
    if (process.env.NODE_ENV === 'test') {
      throw new Error(message);
    }
    console.error('❌ ' + message);
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();

// Warn about missing recommended production env vars
if (config.NODE_ENV === 'production') {
  const missing: string[] = [];
  if (!config.RAZORPAY_KEY_ID) missing.push('RAZORPAY_KEY_ID');
  if (!config.MSG91_AUTH_KEY) missing.push('MSG91_AUTH_KEY');
  if (!config.SENTRY_DSN) missing.push('SENTRY_DSN');
  if (missing.length > 0) {
    console.warn(`[CONFIG] Missing recommended production env vars: ${missing.join(', ')}`);
  }
}

export type Config = z.infer<typeof envSchema>;
