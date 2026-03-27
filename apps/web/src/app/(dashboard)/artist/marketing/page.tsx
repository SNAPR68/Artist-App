'use client';

import { Eye, Share2, ArrowRight } from 'lucide-react';

export default function MarketingIntelligencePage() {
  return (
    <div className="space-y-6 relative">
      {/* ─── Ambient Glows ─── */}
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="relative z-10">
        <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Growth Tools</span>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter text-white mb-2">Marketing Intelligence</h1>
        <p className="text-white/40 text-lg">AI-powered insights to grow your brand and reach</p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        {/* Social Media Reach Card */}
        <div className="glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden group">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10 flex items-start justify-between mb-6">
            <div>
              <p className="text-white/50 text-xs uppercase tracking-widest font-bold mb-2">Total Reach</p>
              <p className="text-5xl font-black text-white">12.4K</p>
            </div>
            <Share2 className="text-[#c39bff] w-8 h-8 opacity-60" />
          </div>
          <div className="flex items-end gap-1 h-12">
            {[40, 60, 45, 70, 55, 80, 50].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-gradient-to-t from-[#c39bff] to-transparent opacity-80"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* Profile Views Card */}
        <div className="glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden group">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#a1faff]/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10 flex items-start justify-between mb-6">
            <div>
              <p className="text-white/50 text-xs uppercase tracking-widest font-bold mb-2">Profile Views</p>
              <p className="text-5xl font-black text-[#a1faff]">847</p>
            </div>
            <Eye className="text-[#a1faff] w-8 h-8 opacity-60" />
          </div>
          <p className="text-xs text-white/40">+12% from last month</p>
        </div>
      </div>

      {/* Marketing Tools */}
      <section className="relative z-10">
        <h2 className="text-lg font-bold uppercase tracking-widest text-white mb-4">Marketing Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card rounded-xl p-6 border border-white/5 group hover:border-white/15 transition-all">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white">Share Your Profile</h3>
              <ArrowRight className="w-5 h-5 text-[#c39bff] group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-sm text-white/50">Generate social media links and QR codes</p>
          </div>
          <div className="glass-card rounded-xl p-6 border border-white/5 group hover:border-white/15 transition-all">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white">Media Kit</h3>
              <ArrowRight className="w-5 h-5 text-[#c39bff] group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-sm text-white/50">Professional media kit for partnerships</p>
          </div>
          <div className="glass-card rounded-xl p-6 border border-white/5 group hover:border-white/15 transition-all">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white">Promo Codes</h3>
              <ArrowRight className="w-5 h-5 text-[#c39bff] group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-sm text-white/50">Create unique discount codes for followers</p>
          </div>
          <div className="glass-card rounded-xl p-6 border border-white/5 group hover:border-white/15 transition-all">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white">Analytics</h3>
              <ArrowRight className="w-5 h-5 text-[#c39bff] group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-sm text-white/50">Track clicks, impressions, and conversions</p>
          </div>
        </div>
      </section>
    </div>
  );
}
