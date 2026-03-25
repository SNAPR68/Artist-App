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
    <div className="theme-nocturne bg-nocturne-base min-h-screen flex items-center justify-center">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all duration-500 ${
                s <= step ? 'bg-nocturne-primary' : 'bg-nocturne-surface-2'
              }`} />
            </div>
          ))}
        </div>

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

            <div className="glass-card-nocturne rounded-xl p-6 border border-nocturne-border space-y-4">
              <div>
                <label className="block text-sm font-medium text-nocturne-text-secondary mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); setError(''); }}
                  placeholder="e.g., Stellar Events Pvt Ltd"
                  className="w-full px-4 py-3 bg-nocturne-surface-2 border border-nocturne-border rounded-lg text-nocturne-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-nocturne-primary/50"
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
                          : 'border-border-nocturne-border bg-nocturne-surface hover:border-nocturne-accent'
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
                <div key={feature.title} className="glass-card-nocturne rounded-xl p-4 border border-nocturne-border flex items-start gap-4">
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
  );
}
