'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth';
import VoiceFillButton from '@/components/voice/VoiceFillButton';
import { analytics } from '@/lib/analytics';

const AGENCY_FORM_CONTEXT = {
  page: 'agency registration form',
  fields: [
    { name: 'companyName', label: 'Company name', type: 'text' as const },
    { name: 'companyType', label: 'Company type', type: 'select' as const, options: ['wedding_planner', 'corporate', 'agency', 'event_management'] },
    { name: 'city', label: 'City', type: 'text' as const },
    { name: 'teamSize', label: 'Team size', type: 'select' as const, options: ['Just me', '2-5', '6-15', '16-50', '50+'] },
    { name: 'eventsPerMonth', label: 'Events per month', type: 'number' as const },
  ],
};

const COMPANY_TYPES = [
  { value: 'wedding_planner', label: 'Wedding Planner', emoji: '💒' },
  { value: 'corporate', label: 'Corporate Events', emoji: '🏢' },
  { value: 'agency', label: 'Talent Agency', emoji: '🎭' },
  { value: 'event_management', label: 'Event Management', emoji: '🎪' },
];

const TEAM_SIZES = ['Just me', '2-5', '6-15', '16-50', '50+'];

type Step = 'info' | 'team' | 'done';

function AgencyJoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<Step>('info');
  const [referralCode] = useState<string | null>(() => searchParams.get('ref'));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Step 1 fields
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [city, setCity] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [eventsPerMonth, setEventsPerMonth] = useState('');

  // Step 2 fields
  const [invitePhones, setInvitePhones] = useState(['', '', '']);

  useEffect(() => {
    analytics.trackEvent('agency_join_viewed');
  }, []);

  const handleCreateWorkspace = useCallback(async () => {
    if (!companyName.trim() || !companyType) return;
    setSubmitting(true);
    setError(null);

    try {
      // If not authenticated, redirect to login first
      if (!isAuthenticated) {
        // Store intent in sessionStorage so after login we can resume
        sessionStorage.setItem('grid_agency_join', JSON.stringify({
          companyName, companyType, city, teamSize, eventsPerMonth,
        }));
        router.push('/login?redirect=/agency/join');
        return;
      }

      // Create client profile if needed
      try {
        await apiClient('/v1/clients/profile', {
          method: 'POST',
          body: JSON.stringify({
            company_name: companyName,
            client_type: 'event_company',
          }),
        });
      } catch {
        // Profile may already exist — non-fatal
      }

      // Create workspace
      const res = await apiClient<{ id: string }>('/v1/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          name: companyName,
          company_type: companyType,
          city: city || undefined,
          description: `${teamSize} team, ~${eventsPerMonth || '?'} events/month`,
        }),
      });

      if (res.success && res.data) {
        setWorkspaceId(res.data.id);
        analytics.trackEvent('agency_workspace_created', {
          company_type: companyType,
          team_size: teamSize,
          events_per_month: eventsPerMonth,
        });
        // Apply referral code silently if present
        if (referralCode) {
          apiClient('/v1/referral/apply', {
            method: 'POST',
            body: JSON.stringify({ referral_code: referralCode }),
          }).catch(() => {});
        }
        setStep('team');
      } else {
        setError(res.errors?.[0]?.message || 'Failed to create workspace');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    }

    setSubmitting(false);
  }, [companyName, companyType, city, teamSize, eventsPerMonth, isAuthenticated, router, referralCode]);

  const handleInviteTeam = useCallback(async () => {
    if (!workspaceId) return;
    setSubmitting(true);

    const phones = invitePhones.filter((p) => p.trim().length >= 10);

    for (const phone of phones) {
      try {
        await apiClient(`/v1/workspaces/${workspaceId}/members`, {
          method: 'POST',
          body: JSON.stringify({ phone, role: 'MEMBER' }),
        });
      } catch {
        // Non-fatal — some invites may fail
      }
    }

    setSubmitting(false);
    analytics.trackEvent('agency_team_invited', { invite_count: phones.length });
    setStep('done');
  }, [workspaceId, invitePhones]);

  const handleSkipInvite = useCallback(() => {
    analytics.trackEvent('agency_team_invite_skipped');
    setStep('done');
  }, []);

  return (
    <div className="min-h-screen bg-[#0e0e0f] flex">
      {/* Left panel — value prop */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-center px-12 py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#c39bff]/5 via-transparent to-[#a1faff]/5" />
        <div className="relative">
          <Link href="/" className="text-xl font-sans font-black tracking-[0.3em] text-white mb-12 block">GRID</Link>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-4">
            Run your event business on one platform.
          </h1>
          <p className="text-white/40 text-sm leading-relaxed mb-10">
            Stop juggling WhatsApp, Excel, and phone calls. GRID gives your agency a deal pipeline, AI-powered artist recommendations, instant proposals, and team collaboration — all in one place.
          </p>

          <div className="space-y-4">
            {[
              'AI decision engine — brief to shortlist in 2 min',
              'Proposal PDFs with your branding, one click',
              'Team pipeline — everyone sees every deal',
              'Escrow payments + GST invoices, automatic',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#a1faff]/15 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a1faff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <span className="text-sm text-white/50">{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-white/5">
            <p className="text-white/20 text-xs">Free for up to 5 briefs/month. No credit card required.</p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden text-xl font-sans font-black tracking-[0.3em] text-white mb-8 block text-center">GRID</Link>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {['info', 'team', 'done'].map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? 'w-8 bg-[#c39bff]' : i < ['info', 'team', 'done'].indexOf(step) ? 'w-4 bg-[#c39bff]/40' : 'w-4 bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* ─── Step 1: Company Info ─── */}
          {step === 'info' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Set up your agency</h2>
                <p className="text-white/30 text-sm">Tell us about your company to get started.</p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Company name */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-medium">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Nocturne Events"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-[#c39bff]/50"
                />
              </div>

              {/* Company type */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-medium">What do you do?</label>
                <div className="grid grid-cols-2 gap-2">
                  {COMPANY_TYPES.map((ct) => (
                    <button
                      key={ct.value}
                      onClick={() => setCompanyType(ct.value)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm text-left transition-all ${
                        companyType === ct.value
                          ? 'border-[#c39bff]/50 bg-[#c39bff]/10 text-white'
                          : 'border-white/8 text-white/40 hover:border-white/15'
                      }`}
                    >
                      <span>{ct.emoji}</span>
                      <span className="text-xs">{ct.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-medium">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-[#c39bff]/50"
                />
              </div>

              {/* Team size */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-medium">Team size</label>
                <div className="flex flex-wrap gap-2">
                  {TEAM_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => setTeamSize(size)}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                        teamSize === size
                          ? 'bg-[#c39bff]/20 text-[#c39bff] border border-[#c39bff]/30'
                          : 'bg-white/5 text-white/30 border border-white/8 hover:border-white/15'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Events per month */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-medium">Events per month (approx)</label>
                <input
                  type="text"
                  value={eventsPerMonth}
                  onChange={(e) => setEventsPerMonth(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-[#c39bff]/50"
                />
              </div>

              {/* CTA */}
              <button
                onClick={handleCreateWorkspace}
                disabled={!companyName.trim() || !companyType || submitting}
                className="w-full py-3.5 rounded-xl bg-white text-[#0e0e0f] font-semibold text-sm hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : isAuthenticated ? 'Create Workspace' : 'Continue to Sign In'}
              </button>

              <p className="text-center text-white/15 text-xs">
                Already have an account? <Link href="/login" className="text-[#c39bff]/60 hover:text-[#c39bff]">Log in</Link>
              </p>
            </div>
          )}

          {/* ─── Step 2: Invite Team ─── */}
          {step === 'team' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Invite your team</h2>
                <p className="text-white/30 text-sm">Add team members by phone number. They&apos;ll get an invite to join your workspace.</p>
              </div>

              {invitePhones.map((phone, i) => (
                <div key={i}>
                  <label className="block text-xs text-white/40 mb-1.5 font-medium">Team member {i + 1}</label>
                  <div className="flex gap-2">
                    <span className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white/30 text-sm">+91</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        const updated = [...invitePhones];
                        updated[i] = e.target.value;
                        setInvitePhones(updated);
                      }}
                      placeholder="Phone number"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-[#c39bff]/50"
                    />
                  </div>
                </div>
              ))}

              <div className="flex gap-3">
                <button
                  onClick={handleInviteTeam}
                  disabled={submitting}
                  className="flex-1 py-3.5 rounded-xl bg-white text-[#0e0e0f] font-semibold text-sm hover:bg-white/90 transition-colors disabled:opacity-40"
                >
                  {submitting ? 'Sending invites...' : 'Send Invites'}
                </button>
                <button
                  onClick={handleSkipInvite}
                  className="px-6 py-3.5 rounded-xl border border-white/10 text-white/40 text-sm hover:text-white hover:border-white/20 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 3: Done ─── */}
          {step === 'done' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#a1faff]/15 flex items-center justify-center mx-auto">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a1faff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">You&apos;re all set!</h2>
                <p className="text-white/30 text-sm">Your workspace <strong className="text-white/60">{companyName}</strong> is ready. Start by submitting your first event brief.</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/event-company')}
                  className="w-full py-3.5 rounded-xl bg-white text-[#0e0e0f] font-semibold text-sm hover:bg-white/90 transition-colors"
                >
                  Go to Agency Dashboard
                </button>
                <button
                  onClick={() => router.push('/event-company/deals')}
                  className="w-full py-3 rounded-xl border border-white/10 text-white/40 text-sm hover:text-white hover:border-white/20 transition-colors"
                >
                  Open Deals Kanban
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {step === 'info' && (
        <VoiceFillButton
          formContext={AGENCY_FORM_CONTEXT}
          onFieldUpdate={(updated) => {
            if (updated.companyName) setCompanyName(updated.companyName);
            if (updated.companyType) setCompanyType(updated.companyType);
            if (updated.city) setCity(updated.city);
            if (updated.teamSize) setTeamSize(updated.teamSize);
            if (updated.eventsPerMonth) setEventsPerMonth(updated.eventsPerMonth);
          }}
        />
      )}
    </div>
  );
}

export default function AgencyJoinPage() {
  return (
    <Suspense fallback={null}>
      <AgencyJoinContent />
    </Suspense>
  );
}
