'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { InstaBookInterestForm } from '@/components/instabook/InstaBookInterestForm';

function InstaBookContent() {
  const params = useSearchParams();
  const source = params.get('source') || 'web';

  return (
    <main className="min-h-screen bg-[#0e0e0f] text-white font-sans">
      <Navbar />

      <div className="pt-24 pb-16 px-4 relative overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute top-20 left-1/3 w-96 h-96 bg-[#c39bff]/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-[#a1faff]/8 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-lg mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#a1faff]/10 border border-[#a1faff]/20 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#a1faff] animate-pulse" />
              <span className="text-[#a1faff] text-xs font-bold uppercase tracking-widest">Coming Soon</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white mb-3">
              Join the Insta<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c39bff] to-[#a1faff]">Book</span> Waitlist
            </h1>
            <p className="text-white/40 text-sm max-w-md mx-auto">
              Book artists instantly at transparent prices. No negotiation. Escrow-protected.
              Tell us about yourself and get priority access.
            </p>
          </div>

          {/* Form */}
          <InstaBookInterestForm source={source} />
        </div>
      </div>
    </main>
  );
}

export default function InstaBookPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0e0e0f] text-white font-sans flex items-center justify-center">
        <div className="text-white/40">Loading...</div>
      </main>
    }>
      <InstaBookContent />
    </Suspense>
  );
}
