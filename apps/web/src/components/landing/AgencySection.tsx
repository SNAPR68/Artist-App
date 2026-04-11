'use client';

import { useRouter } from 'next/navigation';

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    title: 'Deal Pipeline',
    description: 'Track every event from brief to completion. Kanban board with real-time status across your team.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" />
        <path d="M12 14v4" />
        <path d="M8 18h8" />
      </svg>
    ),
    title: 'AI Decision Engine',
    description: 'Submit a brief, get 5 ranked artist recommendations with pricing and confidence scores in under 2 minutes.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
      </svg>
    ),
    title: 'Instant Proposals',
    description: 'Generate branded, client-ready proposal PDFs with one click. Your logo, your terms, their shortlist.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Team Workspace',
    description: 'Invite your team. Assign deals, share notes, track who is working on what — all in one place.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <path d="M1 10h22" />
      </svg>
    ),
    title: 'Payments & GST',
    description: 'Escrow-protected payments, automatic GST invoices, and Tally/Zoho-ready exports.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    title: 'Intelligence & History',
    description: 'Every deal you close builds your data. Search past events, track artist performance, price smarter over time.',
  },
];

export function AgencySection() {
  const router = useRouter();

  return (
    <section className="relative bg-[#0e0e0f] px-6 py-24 overflow-hidden">
      {/* Subtle gradient divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-[#a1faff]/60 mb-4">
            For Event Agencies & Planners
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
            Run your event business on{' '}
            <span className="font-sans font-black tracking-[0.15em]">GRID</span>
          </h2>
          <p className="text-white/40 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Stop juggling WhatsApp, Excel, and phone calls. One platform for briefs, decisions, proposals, bookings, payments, and team coordination.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-white/8 p-6 hover:border-white/15 transition-all duration-300"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-[#a1faff] group-hover:bg-[#a1faff]/10 transition-colors mb-4">
                {feature.icon}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">{feature.title}</h3>
              <p className="text-xs text-white/35 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#0e0e0f] font-semibold text-sm hover:bg-white/90 transition-colors shadow-lg"
          >
            Start Your Free Trial
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
          <p className="text-white/20 text-xs mt-3">Free for up to 5 briefs/month. No credit card required.</p>
        </div>
      </div>
    </section>
  );
}
