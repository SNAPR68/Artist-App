'use client';

import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#0e0e0f] overflow-hidden">
      {/* Ambient Stage Lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 right-0 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-[#a1faff]/5 blur-[120px] rounded-full" />
      </div>

      {/* Fullscreen 5+7 Cinematic Split */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-screen">

        {/* LEFT PANEL: 5 cols - Brand & Features */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-center items-start p-12 xl:p-16">
          {/* Brand Logo */}
          <Link href="/" className="mb-16 block">
            <div className="text-4xl font-display font-extrabold tracking-tighter text-white">
              Artist<span className="bg-gradient-to-r from-[#c39bff] to-[#a1faff] bg-clip-text text-transparent">Book</span>
            </div>
          </Link>

          {/* Headline */}
          <div className="space-y-8 max-w-md">
            <h1 className="text-5xl font-display font-extrabold tracking-tighter leading-tight text-white">
              Book the perfect artist for your event
            </h1>

            {/* Feature Bullets */}
            <div className="space-y-6">
              {[
                { icon: '✨', title: 'Discover Talent', desc: 'Browse thousands of verified artists' },
                { icon: '🎯', title: 'Instant Booking', desc: 'Real-time availability and confirmation' },
                { icon: '🌟', title: 'Verified Profiles', desc: 'Reviews, rates, and performance history' },
              ].map((feature) => (
                <div key={feature.title} className="flex items-start gap-4">
                  <span className="text-2xl flex-shrink-0">{feature.icon}</span>
                  <div>
                    <p className="font-medium text-white">{feature.title}</p>
                    <p className="text-sm text-white/60">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: 7 cols - Glass Form Card */}
        <div className="lg:col-span-7 flex flex-col justify-center items-center p-6 lg:p-0">
          <div className="w-full max-w-md lg:max-w-lg">
            {/* Mobile Logo (visible only on mobile) */}
            <Link href="/" className="mb-8 lg:hidden block text-center">
              <div className="text-3xl font-display font-extrabold tracking-tighter text-white inline-block">
                Artist<span className="bg-gradient-to-r from-[#c39bff] to-[#a1faff] bg-clip-text text-transparent">Book</span>
              </div>
            </Link>

            {/* Glass Card Container */}
            <div className="glass-card p-8 lg:p-10 rounded-3xl border border-white/5 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] relative overflow-hidden">
              {/* Ambient Glow */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#c39bff]/10 blur-3xl rounded-full pointer-events-none" />

              <div className="relative z-10">
                {children}
              </div>
            </div>

            {/* Footer Text */}
            <p className="text-[10px] text-white/40 text-center mt-6 uppercase tracking-widest font-bold">
              Your event. Your artists. Your way.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
