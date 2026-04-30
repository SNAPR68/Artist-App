/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use default .next output dir — consistent with Vercel's expected outputDirectory
  // distDir: '.next',  (default — no override needed)
  transpilePackages: ['@artist-booking/shared', '@artist-booking/ui'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react'],
  },
  async rewrites() {
    return [
      // Brand alias: /agency/* → /client/workspace/*
      { source: '/agency', destination: '/client/workspace' },
      { source: '/agency/:id', destination: '/client/workspace/:id' },
      { source: '/agency/:id/:path*', destination: '/client/workspace/:id/:path*' },
    ];
  },
  // CSP + baseline security headers (sprint FINAL D3.3, 2026-04-26).
  // connect-src allows: API (Render), PostHog, Sentry, Supabase, ElevenLabs TTS proxy.
  // 'unsafe-inline' on script-src retained because Next.js injects inline bootstrap;
  // tightening to strict-dynamic + nonce is a post-MVP hardening.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us.i.posthog.com https://us-assets.i.posthog.com https://*.sentry.io",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: ",
      "media-src 'self' blob: https:",
      "connect-src 'self' https://artist-booking-api.onrender.com https://*.supabase.co wss://*.supabase.co https://us.i.posthog.com https://us-assets.i.posthog.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://api.elevenlabs.io",
      "frame-src 'self' https://*.razorpay.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
