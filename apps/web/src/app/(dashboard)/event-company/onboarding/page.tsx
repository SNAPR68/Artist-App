'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ArrowRight,
  Users,
  Calendar,
  Mic,
  Check,
} from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

const COMPANY_TYPES = [
  { value: 'wedding_planner', label: 'Wedding Planner', emoji: '💍' },
  { value: 'corporate', label: 'Corporate Events', emoji: '🏢' },
  { value: 'college', label: 'College Events', emoji: '🎓' },
  { value: 'festival', label: 'Festival Organizer', emoji: '🎪' },
  { value: 'agency', label: 'Talent Agency', emoji: '🎭' },
  { value: 'club_venue', label: 'Club / Venue', emoji: '🎵' },
];

export default function EventCompanyOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }
    if (!companyType) {
      setError('Select your company type');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create client profile with event_company type
      const res = await apiClient('/v1/clients/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName.trim(),
          client_type: 'event_company',
        }),
      });

      if (!res.success) {
        setError(res.errors?.[0]?.message || 'Failed to create profile');
        setLoading(false);
        return;
      }

      // Create first workspace
      await apiClient('/v1/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${companyName.trim()} Workspace`,
          company_type: companyType,
        }),
      });

      setStep(3);
      setTimeout(() => router.push('/event-company'), 2000);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#0e0e0f] min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full" />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 space-y-6">
            <span className="inline-block px-4 py-1 rounded-full border border-[#c39bff]/20 bg-[#c39bff]/5 text-[#c39bff] text-[10px] font-bold tracking-[0.2em] uppercase">Step {step} of 3</span>
            <h1 className="text-4xl lg:text-5xl font-display font-light tracking-tight leading-tight text-white">
              {step === 1 && <>Set up your <span className="font-bold italic">company</span></>}
              {step === 2 && <>Invite your <span className="font-bold italic">team</span></>}
              {step === 3 && <>You&apos;re <span className="font-bold italic">ready</span></>}
            </h1>
            <p className="text-white/50 text-lg leading-relaxed max-w-md">
              {step === 1 && 'Tell us about your event company so we can match you with the right artists.'}
              {step === 2 && 'Add team members to collaborate on bookings and events.'}
              {step === 3 && 'Your workspace is set up. Start finding and booking artists.'}
            </p>
            <div className="flex items-center gap-3 pt-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s <= step ? 'w-8 bg-[#c39bff]' : 'w-4 bg-white/10'}`} />
              ))}
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="glass-card rounded-3xl p-8 lg:p-10 border border-white/5 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#c39bff]/10 blur-3xl rounded-full pointer-events-none" />
              <div className="relative z-10">

        {step === 1 && (
          <div className="animate-fade-in space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-nocturne-primary flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-display font-bold text-nocturne-text-primary mb-2">
                Set up your Event Company
              </h1>
              <p className="text-nocturne-text-secondary">
                Tell us about your company so we can personalize your experience
              </p>
            </div>

            <div className="glass-card-nocturne rounded-xl p-6 border border-white/10 space-y-4">
              <div>
                <label className="block text-sm font-medium text-nocturne-text-secondary mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); setError(''); }}
                  placeholder="e.g., Stellar Events Pvt Ltd"
                  className="w-full px-4 py-3 bg-nocturne-surface-2 border border-white/10 rounded-lg text-nocturne-text-primary placeholder-nocturne-text-secondary focus:outline-none focus:ring-1 focus:ring-nocturne-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-nocturne-text-secondary mb-2">
                  What type of events do you organize?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {COMPANY_TYPES.map((ct) => (
                    <button
                      key={ct.value}
                      onClick={() => { setCompanyType(ct.value); setError(''); }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        companyType === ct.value
                          ? 'border-nocturne-primary bg-nocturne-primary/10 shadow-nocturne-glow-sm'
                          : 'border-nocturne-border bg-nocturne-surface hover:border-nocturne-accent'
                      }`}
                    >
                      <span className="text-lg">{ct.emoji}</span>
                      <p className="text-sm font-medium text-nocturne-text-primary mt-1">{ct.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <button
                onClick={() => {
                  if (!companyName.trim()) { setError('Company name is required'); return; }
                  if (!companyType) { setError('Select your company type'); return; }
                  setStep(2);
                }}
                className="w-full py-3 bg-nocturne-primary text-white rounded-lg font-medium hover:shadow-nocturne-glow-sm transition-all flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-display font-bold text-nocturne-text-primary mb-2">
                Here&apos;s what you can do
              </h1>
              <p className="text-nocturne-text-secondary">
                Your event company dashboard is packed with features
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: Users, title: 'Team Management', desc: 'Add team members, assign roles, collaborate on events' },
                { icon: Calendar, title: 'Event Pipeline', desc: 'Group bookings by event, track status, bulk actions' },
                { icon: Building2, title: 'Presentation Builder', desc: 'Create branded artist proposal PDFs for clients' },
                { icon: Mic, title: 'Voice Commands', desc: 'Say "find DJs in Mumbai" or "create a presentation" — hands free' },
              ].map((feature) => (
                <div key={feature.title} className="glass-card-nocturne rounded-xl p-4 border border-white/10 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-nocturne-primary flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-nocturne-text-primary">{feature.title}</h3>
                    <p className="text-sm text-nocturne-text-secondary">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 bg-nocturne-primary text-white rounded-lg font-medium hover:shadow-nocturne-glow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting up...
                </span>
              ) : (
                <>Launch Dashboard <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold text-nocturne-text-primary">
              You&apos;re all set!
            </h1>
            <p className="text-nocturne-text-secondary text-lg">
              Welcome to {companyName}. Redirecting to your dashboard...
            </p>
          </div>
        )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
