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
};
module.exports = nextConfig;
