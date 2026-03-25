'use client';

import {
  TrendingUp,
  Eye,
  Share2,
  ArrowRight,
  Zap,
} from 'lucide-react';

export default function MarketingIntelligencePage() {
  return (
    <div className="min-h-screen bg-nocturne-bg-primary p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-gradient-nocturne text-4xl md:text-5xl font-bold mb-2">
            Marketing Intelligence
          </h1>
          <p className="text-nocturne-text-secondary text-lg">
            AI-powered insights to grow your brand
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Social Media Reach Card */}
          <div
            className="glass-card animate-tilt-in p-6 rounded-4xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-nocturne-text-secondary text-sm mb-2">
                  Total Reach
                </p>
                <p className="font-display text-h2 text-nocturne-text-primary">
                  12.4K
                </p>
              </div>
              <Share2 className="text-nocturne-accent w-6 h-6" />
            </div>

            {/* Mini Chart */}
            <div className="flex items-end gap-1 h-12">
              <div
                className="flex-1 rounded-sm bg-gradient-to-t from-nocturne-accent via-nocturne-accent to-transparent opacity-80"
                style={{ height: '40%' }}
              />
              <div
                className="flex-1 rounded-sm bg-gradient-to-t from-cyan-500 to-transparent opacity-80"
                style={{ height: '60%' }}
              />
              <div
                className="flex-1 rounded-sm bg-gradient-to-t from-nocturne-accent via-nocturne-accent to-transparent opacity-80"
                style={{ height: '50%' }}
              />
              <div
                className="flex-1 rounded-sm bg-gradient-to-t from-cyan-500 to-transparent opacity-80"
                style={{ height: '75%' }}
              />
              <div
                className="flex-1 rounded-sm bg-gradient-to-t from-nocturne-accent via-nocturne-accent to-transparent opacity-80"
                style={{ height: '55%' }}
              />
            </div>
          </div>

          {/* Profile Views Card */}
          <div
            className="glass-card animate-tilt-in p-6 rounded-4xl"
            style={{ animationDelay: '100ms' }}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-nocturne-text-secondary text-sm mb-2">
                  This Month
                </p>
                <p className="font-display text-h2 text-nocturne-text-primary">
                  847
                </p>
              </div>
              <Eye className="text-nocturne-accent w-6 h-6" />
            </div>
            <p className="text-nocturne-success text-sm font-medium">
              +23% vs last month
            </p>
          </div>

          {/* Booking Conversion Card */}
          <div
            className="glass-card animate-tilt-in p-6 rounded-4xl"
            style={{ animationDelay: '200ms' }}
          >
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                {/* SVG Circular Progress */}
                <svg
                  className="absolute"
                  width="120"
                  height="120"
                  viewBox="0 0 120 120"
                >
                  {/* Background track */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                  />
                  {/* Progress fill */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#8A2BE2"
                    strokeWidth="8"
                    strokeDasharray={`${(68 / 100) * 2 * Math.PI * 50} ${
                      2 * Math.PI * 50
                    }`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                {/* Center text */}
                <div className="text-center z-10">
                  <p className="font-display text-nocturne-text-primary text-2xl font-bold">
                    68%
                  </p>
                </div>
              </div>
              <div className="flex items-start justify-between w-full">
                <div>
                  <p className="text-nocturne-text-secondary text-sm">
                    Inquiry → Booked
                  </p>
                </div>
                <TrendingUp className="text-nocturne-accent w-5 h-5 flex-shrink-0" />
              </div>
            </div>
          </div>

          {/* AI Recommendations Card */}
          <div
            className="glass-card animate-tilt-in p-6 rounded-4xl"
            style={{ animationDelay: '300ms' }}
          >
            <h3 className="font-display text-nocturne-text-primary text-lg mb-4">
              AI Suggestions
            </h3>

            <div className="space-y-2">
              {/* Suggestion 1 */}
              <div className="glass-panel rounded-2xl p-3 flex gap-3">
                <Zap className="text-nocturne-accent w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-nocturne-text-secondary text-sm">
                  Add a Sufi music tag — 40% of searches in your area include it
                </p>
              </div>

              {/* Suggestion 2 */}
              <div className="glass-panel rounded-2xl p-3 flex gap-3">
                <Zap className="text-nocturne-accent w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-nocturne-text-secondary text-sm">
                  Upload 2 more portfolio videos to increase profile views by 35%
                </p>
              </div>

              {/* Suggestion 3 */}
              <div className="glass-panel rounded-2xl p-3 flex gap-3">
                <Zap className="text-nocturne-accent w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-nocturne-text-secondary text-sm">
                  Lower weekday rates by 15% to fill empty calendar slots
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="glass-panel rounded-4xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="font-display text-nocturne-text-primary text-xl font-semibold mb-1">
              Want more bookings?
            </p>
            <p className="text-nocturne-text-secondary">
              Upgrade to Pro for advanced analytics
            </p>
          </div>
          <button className="btn-nocturne-primary whitespace-nowrap flex items-center justify-center gap-2">
            Upgrade to Pro
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
