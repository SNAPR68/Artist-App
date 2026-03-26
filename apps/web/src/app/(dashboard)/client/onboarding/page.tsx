'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';

const CLIENT_TYPES = [
  { value: 'corporate', label: 'Corporate' },
  { value: 'wedding_planner', label: 'Wedding Planner' },
  { value: 'club_venue', label: 'Club/Venue' },
  { value: 'individual', label: 'Individual' },
  { value: 'event_company', label: 'Event Company' },
];

const EVENT_TYPES = [
  'Wedding', 'Corporate', 'Private Party', 'Concert', 'Club Gig',
  'Festival', 'College Event', 'Restaurant', 'Other',
];

export default function ClientOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Company Info
  const [clientType, setClientType] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [city, setCity] = useState('');

  // Step 2: Event Preferences
  const [eventTypesInterested, setEventTypesInterested] = useState<string[]>([]);
  const [averageBudgetMin, setAverageBudgetMin] = useState<number>(0);
  const [averageBudgetMax, setAverageBudgetMax] = useState<number>(0);

  const isEventCompany = clientType === 'event_company';
  const totalSteps = isEventCompany ? 3 : 2;
  const stepLabels = isEventCompany
    ? ['Company Info', 'Event Preferences', 'Team Setup']
    : ['Company Info', 'Event Preferences'];

  const toggleEventType = (type: string) => {
    if (eventTypesInterested.includes(type)) {
      setEventTypesInterested(eventTypesInterested.filter((t) => t !== type));
    } else {
      setEventTypesInterested([...eventTypesInterested, type]);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return clientType.length > 0;
      case 2: return eventTypesInterested.length > 0;
      case 3: return true; // Team setup is informational
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const res = await apiClient('/v1/clients/profile', {
        method: 'POST',
        body: JSON.stringify({
          client_type: clientType,
          company_name: companyName || undefined,
          company_type: companyType || undefined,
          city: city || undefined,
          event_types_interested: eventTypesInterested,
          average_budget_min: averageBudgetMin > 0 ? averageBudgetMin * 100 : undefined,
          average_budget_max: averageBudgetMax > 0 ? averageBudgetMax * 100 : undefined,
        }),
      });

      if (!res.success) {
        setError(res.errors[0]?.message ?? 'Failed to create profile');
        return;
      }

      router.push('/client');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0e0e0f] min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full" />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left: Editorial */}
          <div className="lg:col-span-5 space-y-6">
            <span className="inline-block px-4 py-1 rounded-full border border-[#c39bff]/20 bg-[#c39bff]/5 text-[#c39bff] text-[10px] font-bold tracking-[0.2em] uppercase">
              Step {step} of {totalSteps}
            </span>
            <h1 className="text-4xl lg:text-5xl font-display font-light tracking-tight leading-tight text-white">
              {step === 1 && <>Set up your <span className="font-bold italic">company</span></>}
              {step === 2 && <>What events do you <span className="font-bold italic">plan?</span></>}
              {step === 3 && <>Build your <span className="font-bold italic">team</span></>}
            </h1>
            <p className="text-white/50 text-lg leading-relaxed max-w-md">
              {step === 1 && 'Tell us about your company so we can match you with the right artists.'}
              {step === 2 && 'What kind of events do you organize? This helps us show you relevant artists.'}
              {step === 3 && 'Invite team members to collaborate on bookings and event management.'}
            </p>
            <div className="flex items-center gap-3 pt-4">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i < step ? 'w-8 bg-[#c39bff]' : 'w-4 bg-white/10'}`} />
              ))}
            </div>
          </div>
          {/* Right: Glass form card */}
          <div className="lg:col-span-7">
            <div className="glass-card rounded-3xl p-8 lg:p-10 border border-white/5 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#c39bff]/10 blur-3xl rounded-full pointer-events-none" />
              <div className="relative z-10">

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Company Info */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-nocturne-text-primary">Tell us about your company</h2>
          <div>
            <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Client Type *</label>
            <select
              value={clientType}
              onChange={(e) => setClientType(e.target.value)}
              className="w-full px-3 py-2 border border-nocturne-border rounded-lg focus:ring-2 focus:ring-nocturne-primary focus:border-nocturne-primary"
            >
              <option value="">Select a type...</option>
              {CLIENT_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-nocturne-border rounded-lg focus:ring-2 focus:ring-nocturne-primary focus:border-nocturne-primary"
              placeholder="Your company or organization name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Company Type</label>
            <input
              type="text"
              value={companyType}
              onChange={(e) => setCompanyType(e.target.value)}
              className="w-full px-3 py-2 border border-nocturne-border rounded-lg focus:ring-2 focus:ring-nocturne-primary focus:border-nocturne-primary"
              placeholder="e.g., Entertainment Agency, Corporate HR, Venue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 border border-nocturne-border rounded-lg focus:ring-2 focus:ring-nocturne-primary focus:border-nocturne-primary"
              placeholder="e.g., Mumbai, Delhi, Bangalore"
            />
          </div>
        </div>
      )}

      {/* Step 2: Event Preferences */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-nocturne-text-primary">Event Preferences</h2>

          <div>
            <label className="block text-sm font-medium text-nocturne-text-secondary mb-2">Event Types You're Interested In *</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleEventType(type)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    eventTypesInterested.includes(type)
                      ? 'bg-nocturne-primary text-white border-primary-500'
                      : 'bg-nocturne-surface text-nocturne-text-secondary border-nocturne-border hover:border-nocturne-accent'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Average Budget Min (INR)</label>
              <input
                type="number"
                value={averageBudgetMin || ''}
                onChange={(e) => setAverageBudgetMin(Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 border border-nocturne-border rounded-lg focus:ring-2 focus:ring-nocturne-primary"
                placeholder="e.g., 25000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-nocturne-text-secondary mb-1">Average Budget Max (INR)</label>
              <input
                type="number"
                value={averageBudgetMax || ''}
                onChange={(e) => setAverageBudgetMax(Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 border border-nocturne-border rounded-lg focus:ring-2 focus:ring-nocturne-primary"
                placeholder="e.g., 200000"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Team Setup (event_company only) */}
      {step === 3 && isEventCompany && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-nocturne-text-primary">Team Setup</h2>
          <div className="bg-blue-900/20 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-300 mb-3">
              You can create a workspace and invite team members from your dashboard after setup.
            </p>
            <Link
              href="/client/workspace"
              className="text-sm font-medium text-nocturne-accent hover:text-nocturne-primary-hover underline"
            >
              Go to Workspace Settings
            </Link>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-6 border-t border-white/5">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="px-6 py-3 text-sm font-medium text-white/60 border border-white/10 rounded-full hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Back
        </button>

        {step < totalSteps ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="px-8 py-3 text-sm font-bold text-white bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] rounded-full shadow-[0_0_20px_rgba(195,155,255,0.2)] hover:shadow-[0_0_30px_rgba(195,155,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !canProceed()}
            className="px-8 py-3 text-sm font-bold text-black bg-white rounded-full hover:shadow-xl disabled:opacity-50 transition-all uppercase tracking-widest"
          >
            {isSubmitting ? 'Creating...' : 'Complete Setup'}
          </button>
        )}
      </div>

              </div>{/* end relative z-10 */}
            </div>{/* end glass card */}
          </div>{/* end lg:col-span-7 */}
        </div>{/* end grid */}
      </div>{/* end max-w-6xl */}
    </div>{/* end bg */}
  );
}
