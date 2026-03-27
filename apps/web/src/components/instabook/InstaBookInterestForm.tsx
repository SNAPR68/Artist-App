'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://artist-booking-api.onrender.com';

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
  'Chandigarh', 'Kochi', 'Goa', 'Indore', 'Bhopal',
];

const ROLE_OPTIONS = [
  { value: 'artist', label: 'Artist / Performer', icon: '🎤', desc: 'I perform at events' },
  { value: 'event_company', label: 'Event Company', icon: '🏢', desc: 'I organize events & book artists' },
  { value: 'client', label: 'Direct Client', icon: '🎉', desc: 'I book artists for my events' },
  { value: 'agent', label: 'Artist Agent / Broker', icon: '🤝', desc: 'I manage or represent artists' },
];

const LEAD_TIMES = [
  { value: 'same_week', label: 'Same week' },
  { value: '1_week', label: '1–2 weeks' },
  { value: '1_month', label: '1 month' },
  { value: '3_months', label: '3+ months' },
];

const EVENT_TYPES_FOR_PRICING = [
  'Wedding', 'Corporate', 'College Fest', 'House Party',
  'Club Night', 'Concert', 'Festival', 'Private Event',
];

interface FormData {
  role: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  customCity: string;
  excitement_score: number;
  top_concern: string;
  would_use_first_month: string;
  // Artist-specific
  would_set_fixed_prices: string;
  fixed_price_event_types: string[];
  typical_lead_time: string;
  broker_vs_direct_pct: number;
  // Event company
  artists_per_month: string;
  wants_wholesale_pricing: string;
  biggest_pain_point: string;
  // Client
  how_find_artists: string;
  most_important: string;
  bad_experience: string;
}

const initialFormData: FormData = {
  role: '',
  name: '',
  phone: '',
  email: '',
  city: '',
  customCity: '',
  excitement_score: 0,
  top_concern: '',
  would_use_first_month: '',
  would_set_fixed_prices: '',
  fixed_price_event_types: [],
  typical_lead_time: '',
  broker_vs_direct_pct: 50,
  artists_per_month: '',
  wants_wholesale_pricing: '',
  biggest_pain_point: '',
  how_find_artists: '',
  most_important: '',
  bad_experience: '',
};

export function InstaBookInterestForm({ source = 'web' }: { source?: string }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  }

  function toggleEventType(type: string) {
    setForm((prev) => ({
      ...prev,
      fixed_price_event_types: prev.fixed_price_event_types.includes(type)
        ? prev.fixed_price_event_types.filter((t) => t !== type)
        : [...prev.fixed_price_event_types, type],
    }));
  }

  function canProceed(): boolean {
    switch (step) {
      case 1: return !!form.role;
      case 2: return form.name.length >= 2 && form.phone.length >= 10 && (form.city !== '' || form.customCity.length >= 2);
      case 3: return true; // Role-specific fields are optional
      case 4: return form.excitement_score > 0 && form.would_use_first_month !== '';
      default: return true;
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');

    const roleSpecificData: Record<string, unknown> = {};
    if (form.role === 'artist') {
      roleSpecificData.would_set_fixed_prices = form.would_set_fixed_prices;
      roleSpecificData.fixed_price_event_types = form.fixed_price_event_types;
      roleSpecificData.typical_lead_time = form.typical_lead_time;
      roleSpecificData.broker_vs_direct_pct = form.broker_vs_direct_pct;
    } else if (form.role === 'event_company') {
      roleSpecificData.artists_per_month = form.artists_per_month;
      roleSpecificData.wants_wholesale_pricing = form.wants_wholesale_pricing;
      roleSpecificData.biggest_pain_point = form.biggest_pain_point;
    } else if (form.role === 'client') {
      roleSpecificData.how_find_artists = form.how_find_artists;
      roleSpecificData.most_important = form.most_important;
      roleSpecificData.bad_experience = form.bad_experience;
    }

    try {
      const res = await fetch(`${API_URL}/v1/instabook-interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: form.role,
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          city: form.city === 'Other' ? form.customCity : form.city,
          excitement_score: form.excitement_score,
          top_concern: form.top_concern || undefined,
          would_use_first_month: form.would_use_first_month,
          role_specific_data: roleSpecificData,
          source,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setStep(5);
      } else {
        setError(data.errors?.[0]?.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="glass-card rounded-2xl p-8 md:p-12 text-center relative overflow-hidden max-w-lg mx-auto">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-2xl font-display font-extrabold text-white mb-3">You&apos;re on the list!</h2>
        <p className="text-white/50 mb-6">
          We&apos;ll notify you as soon as InstaBook goes live. Thanks for your interest!
        </p>
        <div className="glass-card rounded-xl p-4 border border-[#c39bff]/20 mb-6">
          <p className="text-xs uppercase tracking-widest text-[#a1faff] font-bold mb-1">What happens next</p>
          <p className="text-white/60 text-sm">
            Our team will reach out to early supporters first. You&apos;ll get priority access to InstaBook before anyone else.
          </p>
        </div>
        <button
          onClick={() => { window.location.href = '/'; }}
          className="btn-nocturne-primary px-6 py-3 rounded-xl text-sm font-semibold"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-white/40 mb-2">
          <span>Step {step} of {totalSteps - 1}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#c39bff] to-[#a1faff] rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 1: Role */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-display font-extrabold text-white mb-2">Who are you?</h2>
              <p className="text-white/40 text-sm mb-6">Select the role that best describes you</p>
              <div className="grid grid-cols-2 gap-3">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => update('role', opt.value)}
                    className={`glass-card rounded-xl p-4 text-left border transition-all ${
                      form.role === opt.value
                        ? 'border-[#c39bff]/50 bg-[#c39bff]/10 shadow-[0_0_20px_rgba(195,155,255,0.15)]'
                        : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="text-2xl mb-2">{opt.icon}</div>
                    <div className="text-sm font-semibold text-white">{opt.label}</div>
                    <div className="text-xs text-white/40 mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Contact */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-display font-extrabold text-white mb-2">Your details</h2>
              <p className="text-white/40 text-sm mb-6">So we can reach you when InstaBook launches</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">
                    Name <span className="text-[#c39bff]">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Your full name"
                    className="input-nocturne w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">
                    Phone <span className="text-[#c39bff]">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="input-nocturne w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="Optional"
                    className="input-nocturne w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">
                    City <span className="text-[#c39bff]">*</span>
                  </label>
                  <select
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    className="input-nocturne w-full"
                  >
                    <option value="">Select your city</option>
                    {INDIAN_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  {form.city === 'Other' && (
                    <input
                      type="text"
                      value={form.customCity}
                      onChange={(e) => update('customCity', e.target.value)}
                      placeholder="Enter your city"
                      className="input-nocturne w-full mt-2"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Role-specific */}
          {step === 3 && form.role === 'artist' && (
            <div>
              <h2 className="text-xl font-display font-extrabold text-white mb-2">As an artist...</h2>
              <p className="text-white/40 text-sm mb-6">Help us understand your booking preferences</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">
                    Would you set fixed prices for certain event types?
                  </label>
                  <div className="flex gap-2">
                    {['yes', 'no', 'maybe'].map((v) => (
                      <button
                        key={v}
                        onClick={() => update('would_set_fixed_prices', v)}
                        className={`px-4 py-2 rounded-lg text-sm capitalize transition-all ${
                          form.would_set_fixed_prices === v
                            ? 'bg-[#c39bff]/20 text-[#c39bff] border border-[#c39bff]/40'
                            : 'bg-white/5 text-white/50 border border-white/5 hover:border-white/10'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {form.would_set_fixed_prices === 'yes' && (
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-2">Which event types?</label>
                    <div className="flex flex-wrap gap-2">
                      {EVENT_TYPES_FOR_PRICING.map((type) => (
                        <button
                          key={type}
                          onClick={() => toggleEventType(type)}
                          className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                            form.fixed_price_event_types.includes(type)
                              ? 'bg-[#c39bff]/20 text-[#c39bff] border border-[#c39bff]/40'
                              : 'bg-white/5 text-white/40 border border-white/5'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">Typical booking lead time</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LEAD_TIMES.map((lt) => (
                      <button
                        key={lt.value}
                        onClick={() => update('typical_lead_time', lt.value)}
                        className={`px-3 py-2 rounded-lg text-sm transition-all ${
                          form.typical_lead_time === lt.value
                            ? 'bg-[#c39bff]/20 text-[#c39bff] border border-[#c39bff]/40'
                            : 'bg-white/5 text-white/40 border border-white/5'
                        }`}
                      >
                        {lt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">
                    What % of your gigs come through brokers? <span className="text-[#a1faff]">{form.broker_vs_direct_pct}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={10}
                    value={form.broker_vs_direct_pct}
                    onChange={(e) => update('broker_vs_direct_pct', Number(e.target.value))}
                    className="w-full accent-[#c39bff]"
                  />
                  <div className="flex justify-between text-xs text-white/30 mt-1">
                    <span>All direct</span>
                    <span>All through brokers</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && form.role === 'event_company' && (
            <div>
              <h2 className="text-xl font-display font-extrabold text-white mb-2">As an event company...</h2>
              <p className="text-white/40 text-sm mb-6">Help us tailor InstaBook for your operations</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">
                    How many artists do you book per month?
                  </label>
                  <select
                    value={form.artists_per_month}
                    onChange={(e) => update('artists_per_month', e.target.value)}
                    className="input-nocturne w-full"
                  >
                    <option value="">Select</option>
                    <option value="1-5">1–5</option>
                    <option value="6-15">6–15</option>
                    <option value="16-30">16–30</option>
                    <option value="30+">30+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">
                    Would you want wholesale/preferred pricing for volume bookings?
                  </label>
                  <div className="flex gap-2">
                    {['yes', 'no', 'maybe'].map((v) => (
                      <button
                        key={v}
                        onClick={() => update('wants_wholesale_pricing', v)}
                        className={`px-4 py-2 rounded-lg text-sm capitalize transition-all ${
                          form.wants_wholesale_pricing === v
                            ? 'bg-[#c39bff]/20 text-[#c39bff] border border-[#c39bff]/40'
                            : 'bg-white/5 text-white/50 border border-white/5 hover:border-white/10'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">
                    What&apos;s your biggest operational pain point?
                  </label>
                  <textarea
                    value={form.biggest_pain_point}
                    onChange={(e) => update('biggest_pain_point', e.target.value)}
                    placeholder="Artist no-shows, payment delays, finding new talent..."
                    rows={3}
                    className="input-nocturne w-full resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && form.role === 'client' && (
            <div>
              <h2 className="text-xl font-display font-extrabold text-white mb-2">As someone who books artists...</h2>
              <p className="text-white/40 text-sm mb-6">Help us understand your experience</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">
                    How do you currently find artists?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'referral', label: 'Word of mouth' },
                      { value: 'instagram', label: 'Instagram / Social' },
                      { value: 'google', label: 'Google search' },
                      { value: 'broker', label: 'Through a broker' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => update('how_find_artists', opt.value)}
                        className={`px-3 py-2 rounded-lg text-sm transition-all ${
                          form.how_find_artists === opt.value
                            ? 'bg-[#c39bff]/20 text-[#c39bff] border border-[#c39bff]/40'
                            : 'bg-white/5 text-white/40 border border-white/5'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">
                    What&apos;s most important to you when booking?
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'price_transparency', label: 'Price clarity' },
                      { value: 'speed', label: 'Speed' },
                      { value: 'reliability', label: 'Reliability' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => update('most_important', opt.value)}
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${
                          form.most_important === opt.value
                            ? 'bg-[#c39bff]/20 text-[#c39bff] border border-[#c39bff]/40'
                            : 'bg-white/5 text-white/40 border border-white/5'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">
                    Ever had a bad booking experience? Tell us about it.
                  </label>
                  <textarea
                    value={form.bad_experience}
                    onChange={(e) => update('bad_experience', e.target.value)}
                    placeholder="Artist cancelled last minute, payment issues, quality mismatch..."
                    rows={3}
                    className="input-nocturne w-full resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && form.role === 'agent' && (
            <div>
              <h2 className="text-xl font-display font-extrabold text-white mb-2">As an agent...</h2>
              <p className="text-white/40 text-sm mb-6">Tell us about your operations</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">
                    How many artists do you represent?
                  </label>
                  <select
                    value={form.artists_per_month}
                    onChange={(e) => update('artists_per_month', e.target.value)}
                    className="input-nocturne w-full"
                  >
                    <option value="">Select</option>
                    <option value="1-5">1–5</option>
                    <option value="6-15">6–15</option>
                    <option value="16-30">16–30</option>
                    <option value="30+">30+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">
                    What&apos;s your biggest challenge managing bookings?
                  </label>
                  <textarea
                    value={form.biggest_pain_point}
                    onChange={(e) => update('biggest_pain_point', e.target.value)}
                    placeholder="Scheduling conflicts, payment collection, client management..."
                    rows={3}
                    className="input-nocturne w-full resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Excitement */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-display font-extrabold text-white mb-2">How excited are you?</h2>
              <p className="text-white/40 text-sm mb-6">About booking artists instantly with transparent pricing</p>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-3">
                    Excitement level <span className="text-[#c39bff]">*</span>
                  </label>
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        onClick={() => update('excitement_score', score)}
                        className={`w-12 h-12 rounded-xl text-lg font-bold transition-all ${
                          form.excitement_score >= score
                            ? 'bg-gradient-to-br from-[#c39bff] to-[#b68cf6] text-[#0e0e0f] shadow-[0_0_20px_rgba(195,155,255,0.3)]'
                            : 'bg-white/5 text-white/30 border border-white/5 hover:border-white/10'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-white/30 mt-2 px-1">
                    <span>Not interested</span>
                    <span>Can&apos;t wait!</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">
                    Would you use InstaBook in the first month? <span className="text-[#c39bff]">*</span>
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'yes', label: 'Yes, definitely' },
                      { value: 'maybe', label: 'Maybe' },
                      { value: 'no', label: 'Probably not' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => update('would_use_first_month', opt.value)}
                        className={`flex-1 px-3 py-2.5 rounded-lg text-sm transition-all ${
                          form.would_use_first_month === opt.value
                            ? 'bg-[#c39bff]/20 text-[#c39bff] border border-[#c39bff]/40'
                            : 'bg-white/5 text-white/40 border border-white/5'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">
                    Any concerns about instant booking?
                  </label>
                  <textarea
                    value={form.top_concern}
                    onChange={(e) => update('top_concern', e.target.value)}
                    placeholder="What would hold you back? Pricing fairness, trust, quality..."
                    rows={3}
                    className="input-nocturne w-full resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            step === 1 ? 'invisible' : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/5'
          }`}
        >
          Back
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#c39bff] to-[#b68cf6] text-[#0e0e0f] disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_rgba(195,155,255,0.3)]"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canProceed() || submitting}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#c39bff] to-[#b68cf6] text-[#0e0e0f] disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_rgba(195,155,255,0.3)]"
          >
            {submitting ? 'Submitting...' : 'Join the Waitlist'}
          </button>
        )}
      </div>
    </div>
  );
}
