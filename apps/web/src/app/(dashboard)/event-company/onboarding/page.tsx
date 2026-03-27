'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Users, Calendar, Mic, ArrowRight, Check } from 'lucide-react';
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
      {/* Ambient Stage Lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* LEFT: 5 cols - Brand & Features */}
          <div className="lg:col-span-5 space-y-8">
            <span className="inline-block px-4 py-1.5 rounded-full border border-[#c39bff]/20 bg-[#c39bff]/5 text-[#c39bff] text-[10px] font-bold tracking-[0.2em] uppercase">
              Step {step} of 3
            </span>

            <h1 className="text-4xl lg:text-5xl font-display font-extrabold tracking-tighter leading-tight text-white">
              {step === 1 && <>Set up your <span className="text-transparent bg-gradient-to-r from-[#c39bff] to-[#a1faff] bg-clip-text italic">company</span></>}
              {step === 2 && <>Invite your <span className="text-transparent bg-gradient-to-r from-[#c39bff] to-[#a1faff] bg-clip-text italic">team</span></>}
              {step === 3 && <>You&apos;re <span className="text-transparent bg-gradient-to-r from-[#c39bff] to-[#a1faff] bg-clip-text italic">ready</span></>}
            </h1>

            <p className="text-white/60 text-lg leading-relaxed max-w-md">
              {step === 1 && 'Tell us about your event company so we can match you with the right artists.'}
              {step === 2 && 'Add team members to collaborate on bookings and events.'}
              {step === 3 && 'Your workspace is set up. Start finding and booking artists.'}
            </p>

            {/* Progress Dots */}
            <div className="flex items-center gap-3 pt-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`h-2 rounded-full transition-all duration-300 ${s <= step ? 'w-8 bg-[#c39bff]' : 'w-4 bg-white/10'}`} />
              ))}
            </div>
          </div>

          {/* RIGHT: 7 cols - Glass Form Card */}
          <div className="lg:col-span-7">
            <div className="glass-card rounded-3xl p-8 lg:p-10 border border-white/5 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#c39bff]/10 blur-3xl rounded-full pointer-events-none" />

              <div className="relative z-10 space-y-6">
                {/* Step 1: Company Setup */}
                {step === 1 && (
                  <div className="animate-fade-in space-y-6">
                    <div>
                      <h2 className="text-2xl font-display font-extrabold tracking-tighter text-white mb-2">
                        Set up your Event Company
                      </h2>
                      <p className="text-white/60">Tell us about your company so we can personalize your experience</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white/60 mb-2">
                          Company Name *
                        </label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => { setCompanyName(e.target.value); setError(''); }}
                          placeholder="e.g., Stellar Events Pvt Ltd"
                          className="input-nocturne"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/60 mb-3">
                          What type of events do you organize? *
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {COMPANY_TYPES.map((ct) => (
                            <button
                              key={ct.value}
                              onClick={() => { setCompanyType(ct.value); setError(''); }}
                              className={`p-4 rounded-xl border text-left transition-all ${
                                companyType === ct.value
                                  ? 'border-[#c39bff] bg-[#c39bff]/10 shadow-[0_0_20px_rgba(195,155,255,0.2)]'
                                  : 'border-white/10 bg-white/5 hover:border-white/20'
                              }`}
                            >
                              <span className="text-lg">{ct.emoji}</span>
                              <p className="text-sm font-semibold text-white mt-2">{ct.label}</p>
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
                        className="w-full py-3 bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(195,155,255,0.2)] hover:shadow-[0_0_30px_rgba(195,155,255,0.4)] transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                      >
                        Continue <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Features Preview */}
                {step === 2 && (
                  <div className="animate-fade-in space-y-6">
                    <div>
                      <h2 className="text-2xl font-display font-extrabold tracking-tighter text-white mb-2">
                        Here&apos;s what you can do
                      </h2>
                      <p className="text-white/60">Your event company dashboard is packed with features</p>
                    </div>

                    <div className="space-y-3">
                      {[
                        { icon: Users, title: 'Team Management', desc: 'Add team members, assign roles, collaborate on events' },
                        { icon: Calendar, title: 'Event Pipeline', desc: 'Group bookings by event, track status, bulk actions' },
                        { icon: Building2, title: 'Presentation Builder', desc: 'Create branded artist proposal PDFs for clients' },
                        { icon: Mic, title: 'Voice Commands', desc: 'Say "find DJs in Mumbai" or "create a presentation" — hands free' },
                      ].map((feature) => (
                        <div key={feature.title} className="glass-panel rounded-xl p-4 border border-white/10 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#c39bff]/20 flex items-center justify-center flex-shrink-0">
                            <feature.icon className="w-5 h-5 text-[#c39bff]" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{feature.title}</h3>
                            <p className="text-sm text-white/60">{feature.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="w-full py-3 bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(195,155,255,0.2)] hover:shadow-[0_0_30px_rgba(195,155,255,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-widest"
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

                {/* Step 3: Success */}
                {step === 3 && (
                  <div className="animate-fade-in text-center space-y-6">
                    <div className="w-20 h-20 rounded-full bg-emerald-600/30 flex items-center justify-center mx-auto">
                      <Check className="w-10 h-10 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-display font-extrabold tracking-tighter text-white mb-2">
                        You&apos;re all set!
                      </h2>
                      <p className="text-white/60 text-lg">
                        Welcome to {companyName}. Redirecting to your dashboard...
                      </p>
                    </div>
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
