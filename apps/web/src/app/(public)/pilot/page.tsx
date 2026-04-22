'use client';

/**
 * Pilot recruitment landing page (2026-04-22).
 *
 * Targets event companies in Mumbai/Delhi/Bengaluru/Goa. Pitches GRID as the
 * Event Company OS (multi-vendor file + call sheet + day-of check-ins), not as
 * artist-booking. Waitlist capture writes to instabook_interests with
 * role='event_company' and role_specific_data.pilot=true so admin can slice.
 */

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { analytics } from '@/lib/analytics';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://artist-booking-api.onrender.com';

const CITIES = ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Goa', 'Hyderabad', 'Pune', 'Chennai', 'Other'];
const EVENTS_PER_MONTH = ['1–3', '4–10', '11–25', '25+'];
const PAIN_POINTS = [
  'Chasing vendors for call times on WhatsApp',
  'Rebuilding call sheets in Excel every event',
  'Tracking payouts across 10+ vendors per event',
  'Day-of chaos — no single source of truth',
  'Clients asking for updates I have to hunt down',
];

const PERKS = [
  { icon: '✦', title: 'Free during pilot', sub: 'Zero cost for 90 days. Post-pilot pricing decided with your input.' },
  { icon: '✦', title: 'White-glove onboarding', sub: 'We set up your first 3 events with you. You learn the OS by running real work through it.' },
  { icon: '✦', title: 'Founder hotline', sub: 'Raj\u2019s WhatsApp. Ping anytime. You shape the roadmap.' },
  { icon: '✦', title: 'First-mover lock-in', sub: 'Grandfather pricing. Your workflows become the defaults.' },
];

const WHATS_IN_IT = [
  { kpi: 'Event File', line: 'One URL per event. Client, vendors, call times, riders, BOQ \u2014 unified.' },
  { kpi: 'Auto Call Sheet', line: 'PDF + Excel + WhatsApp broadcast. Generated in 2 seconds, not 2 hours.' },
  { kpi: 'Outbound Voice', line: 'We call vendors T-24h to confirm. You see green/red on one screen.' },
  { kpi: 'Day-of Check-ins', line: 'Every vendor gets a GPS + voice ping. No more phone-tree Sunday mornings.' },
  { kpi: 'EPK on demand', line: 'Artist one-pager PDF + PPTX + reel. Generated from their profile, branded to you.' },
  { kpi: 'BOQ Builder', line: 'Your internal bill-of-quantity, per event, in one shared file.' },
];

export default function PilotLandingPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [founderName, setFounderName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [eventsPerMonth, setEventsPerMonth] = useState('');
  const [pain, setPain] = useState<string[]>([]);
  const [startWhen, setStartWhen] = useState('asap');

  useEffect(() => {
    analytics.trackEvent('pilot_page_viewed');
  }, []);

  const canSubmit = useMemo(
    () => companyName.trim() && founderName.trim() && /^\+?\d{10,14}$/.test(phone.replace(/\s/g, '')) && city && eventsPerMonth,
    [companyName, founderName, phone, city, eventsPerMonth],
  );

  const togglePain = (p: string) => {
    setPain((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/v1/instabook-interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'event_company',
          name: `${founderName} \u2014 ${companyName}`,
          phone: phone.replace(/\s/g, '').startsWith('+') ? phone.replace(/\s/g, '') : `+91${phone.replace(/\s/g, '')}`,
          email: email.trim() || null,
          city: city === 'Other' ? 'Other' : city,
          excitement_score: 5,
          would_use_first_month: 'yes',
          top_concern: pain.length ? pain.join(' | ') : null,
          role_specific_data: {
            pilot: true,
            company_name: companyName.trim(),
            events_per_month: eventsPerMonth,
            start_when: startWhen,
            pain_points: pain,
            source_page: '/pilot',
          },
          source: 'web',
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.errors?.[0]?.message ?? `HTTP ${res.status}`);
      }

      analytics.trackEvent('pilot_application_submitted', { city, events_per_month: eventsPerMonth });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. WhatsApp us at +91 96XXXXXXXX.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-66px)] flex items-center justify-center px-6 py-20">
        <div className="glass-card max-w-xl w-full p-12 text-center relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#c39bff]/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#a1faff]/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative">
            <div className="text-6xl mb-6">✦</div>
            <h1 className="font-display text-4xl font-extrabold tracking-tighter text-white mb-4">
              You&apos;re on the list.
            </h1>
            <p className="text-white/60 text-lg mb-8 leading-relaxed">
              Raj will WhatsApp you within 24 hours to set up a 30-min walkthrough.
              If your fit is strong, we&apos;ll onboard your first event together this week.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition"
            >
              Back to GRID
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-66px)]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-[#c39bff]/15 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute top-40 -left-40 w-[500px] h-[500px] bg-[#a1faff]/10 blur-[150px] rounded-full pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-xs tracking-widest uppercase font-bold text-[#a1faff]">
              GRID PILOT · INDIA 2026
            </span>
            <span className="text-xs tracking-widest uppercase font-bold text-white/30">
              · 10 spots
            </span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tighter text-white leading-[0.95] max-w-4xl">
            Run your next event on the{' '}
            <span className="text-gradient-nocturne">Event Company OS.</span>
          </h1>

          <p className="mt-8 text-xl text-white/60 max-w-2xl leading-relaxed">
            GRID is the operating system for India&apos;s event companies.
            One file covers every vendor — artists, AV, photo, decor, licensing, transport.
            Call sheets, day-of check-ins, EPKs, BOQs — generated, not assembled.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#apply"
              className="px-8 py-4 rounded-lg bg-gradient-to-r from-[#c39bff] to-[#a1faff] text-black font-bold hover:opacity-90 transition"
            >
              Apply to Pilot
            </a>
            <a
              href="#how"
              className="px-8 py-4 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition"
            >
              See how it works
            </a>
          </div>

          <p className="mt-6 text-sm text-white/40">
            Free for 90 days · Mumbai · Delhi NCR · Bengaluru · Goa
          </p>
        </div>
      </section>

      {/* What&apos;s in it */}
      <section id="how" className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="flex items-center gap-3 mb-12">
          <span className="text-xs tracking-widest uppercase font-bold text-[#c39bff]">
            THE OS
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <h2 className="font-display text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-16 max-w-3xl">
          Six things stop being manual the day you join.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {WHATS_IN_IT.map((item) => (
            <div key={item.kpi} className="glass-card p-8 border border-white/5 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#c39bff]/10 blur-[60px] rounded-full pointer-events-none" />
              <div className="relative">
                <div className="text-xs tracking-widest uppercase font-bold text-[#a1faff] mb-3">
                  {item.kpi}
                </div>
                <p className="text-white/80 text-lg leading-relaxed">{item.line}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Perks */}
      <section className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="flex items-center gap-3 mb-12">
          <span className="text-xs tracking-widest uppercase font-bold text-[#ffbf00]">
            WHY JOIN NOW
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PERKS.map((p) => (
            <div key={p.title} className="glass-card p-8 border border-white/5">
              <div className="text-[#ffbf00] text-2xl mb-4">{p.icon}</div>
              <h3 className="font-display text-2xl font-extrabold tracking-tight text-white mb-2">
                {p.title}
              </h3>
              <p className="text-white/60 leading-relaxed">{p.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Apply */}
      <section id="apply" className="relative max-w-3xl mx-auto px-6 py-20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-xs tracking-widest uppercase font-bold text-[#c39bff]">
              APPLY
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <h2 className="font-display text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-4">
            Tell us about your company.
          </h2>
          <p className="text-white/50 mb-10">
            90 seconds. We&apos;ll WhatsApp you within 24 hours.
          </p>

          <form onSubmit={handleSubmit} className="glass-card p-8 md:p-10 border border-white/5 space-y-6">
            {/* Company */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs tracking-widest uppercase font-bold text-white/50 mb-2">
                  Company name *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Wedloom Events"
                  className="input-nocturne w-full"
                />
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase font-bold text-white/50 mb-2">
                  Your name *
                </label>
                <input
                  type="text"
                  required
                  value={founderName}
                  onChange={(e) => setFounderName(e.target.value)}
                  placeholder="Founder / Ops head"
                  className="input-nocturne w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs tracking-widest uppercase font-bold text-white/50 mb-2">
                  WhatsApp number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98XXXXXXXX"
                  className="input-nocturne w-full"
                />
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase font-bold text-white/50 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input-nocturne w-full"
                />
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs tracking-widest uppercase font-bold text-white/50 mb-3">
                City *
              </label>
              <div className="flex flex-wrap gap-2">
                {CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCity(c)}
                    className={`px-4 py-2 rounded-lg border text-sm transition ${
                      city === c
                        ? 'bg-[#c39bff] text-black border-[#c39bff] font-bold'
                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Events per month */}
            <div>
              <label className="block text-xs tracking-widest uppercase font-bold text-white/50 mb-3">
                Events per month *
              </label>
              <div className="flex flex-wrap gap-2">
                {EVENTS_PER_MONTH.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEventsPerMonth(e)}
                    className={`px-4 py-2 rounded-lg border text-sm transition ${
                      eventsPerMonth === e
                        ? 'bg-[#a1faff] text-black border-[#a1faff] font-bold'
                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Pain */}
            <div>
              <label className="block text-xs tracking-widest uppercase font-bold text-white/50 mb-3">
                What kills your week? (pick any)
              </label>
              <div className="space-y-2">
                {PAIN_POINTS.map((p) => {
                  const active = pain.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePain(p)}
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition ${
                        active
                          ? 'bg-[#c39bff]/10 text-white border-[#c39bff]/40'
                          : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="mr-3 text-[#c39bff]">{active ? '✓' : '○'}</span>
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Start when */}
            <div>
              <label className="block text-xs tracking-widest uppercase font-bold text-white/50 mb-3">
                When can you start?
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { v: 'asap', l: 'This week' },
                  { v: '2_weeks', l: 'Next 2 weeks' },
                  { v: '1_month', l: 'Within a month' },
                ].map((s) => (
                  <button
                    key={s.v}
                    type="button"
                    onClick={() => setStartWhen(s.v)}
                    className={`px-4 py-2 rounded-lg border text-sm transition ${
                      startWhen === s.v
                        ? 'bg-[#ffbf00] text-black border-[#ffbf00] font-bold'
                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {s.l}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="w-full py-4 rounded-lg bg-gradient-to-r from-[#c39bff] to-[#a1faff] text-black font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
            >
              {submitting ? 'Submitting\u2026' : 'Apply to GRID Pilot \u2192'}
            </button>

            <p className="text-xs text-white/30 text-center">
              By applying, you agree to a 30-min walkthrough call.
              No payment collected during pilot.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
