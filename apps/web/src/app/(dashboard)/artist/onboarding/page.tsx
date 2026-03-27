'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import { MediaUploader } from '../../../../components/media/MediaUploader';

const EVENT_TYPES = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'private_party', label: 'Private Party' },
  { value: 'concert', label: 'Concert' },
  { value: 'club_gig', label: 'Club Night' },
  { value: 'festival', label: 'Festival' },
  { value: 'college_event', label: 'College Fest' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'other', label: 'Other' },
];

const GENRES = [
  'Bollywood', 'Classical', 'Sufi', 'Rock', 'Pop', 'Hip Hop',
  'EDM', 'Jazz', 'Folk', 'Ghazal', 'Devotional', 'Indie',
  'Fusion', 'Carnatic', 'Hindustani', 'Playback', 'DJ',
];

const LANGUAGES = [
  'Hindi', 'English', 'Punjabi', 'Tamil', 'Telugu', 'Kannada',
  'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Urdu',
];

interface PricingEntry {
  event_type: string;
  city_tier: string;
  min_price: number;
  max_price: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Basic Info
  const [stageName, setStageName] = useState('');
  const [bio, setBio] = useState('');
  const [baseCity, setBaseCity] = useState('');
  const [travelRadius, setTravelRadius] = useState(50);

  // Step 2: Performance Details
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [durationMin, setDurationMin] = useState(30);
  const [durationMax, setDurationMax] = useState(120);

  // Step 3: Pricing
  const [pricing, setPricing] = useState<PricingEntry[]>([
    { event_type: 'wedding', city_tier: 'tier_1', min_price: 50000, max_price: 200000 },
  ]);

  // Step 4: Media
  const [media, setMedia] = useState<Array<{ id: string; media_type: 'image' | 'video'; original_url: string; thumbnail_url?: string; transcode_status: string; sort_order: number }>>([]);
  const [profileCreated, setProfileCreated] = useState(false);

  // Pre-fill from social media analyzer
  useEffect(() => {
    try {
      const stored = localStorage.getItem('social_prefill');
      if (!stored) return;

      const data = JSON.parse(stored);
      if (data.display_name) setStageName(data.display_name);
      if (data.suggested_bio) setBio(data.suggested_bio);
      if (data.suggested_genres && Array.isArray(data.suggested_genres)) {
        const matched = data.suggested_genres.filter((g: string) => GENRES.includes(g));
        if (matched.length > 0) setSelectedGenres(matched);
      }

      localStorage.removeItem('social_prefill');
    } catch {
      // Ignore malformed data
    }
  }, []);

  const toggleItem = (list: string[], item: string, setter: (v: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const addPricingRow = () => {
    setPricing([...pricing, { event_type: 'wedding', city_tier: 'tier_1', min_price: 0, max_price: 0 }]);
  };

  const removePricingRow = (index: number) => {
    setPricing(pricing.filter((_, i) => i !== index));
  };

  const updatePricing = (index: number, field: keyof PricingEntry, value: string | number) => {
    const updated = [...pricing];
    updated[index] = { ...updated[index], [field]: value };
    setPricing(updated);
  };

  const handleCreateProfile = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const res = await apiClient('/v1/artists/profile', {
        method: 'POST',
        body: JSON.stringify({
          stage_name: stageName,
          bio: bio || undefined,
          base_city: baseCity,
          travel_radius_km: travelRadius,
          genres: selectedGenres,
          languages: selectedLanguages,
          event_types: selectedEventTypes,
          performance_duration_min: durationMin,
          performance_duration_max: durationMax,
          pricing,
        }),
      });

      if (!res.success) {
        setError(res.errors[0]?.message ?? 'Failed to create profile');
        return;
      }

      setProfileCreated(true);
      setStep(4);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadMedia = async () => {
    const res = await apiClient<{ media: typeof media }>('/v1/artists/profile');
    if (res.success && res.data.media) {
      setMedia(res.data.media);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return stageName.trim().length > 0 && baseCity.trim().length > 0;
      case 2: return selectedGenres.length > 0 && selectedEventTypes.length > 0 && selectedLanguages.length > 0;
      case 3: return pricing.length > 0 && pricing.every((p) => p.max_price >= p.min_price && p.min_price > 0);
      case 4: return true;
      default: return false;
    }
  };

  return (
    <div className="bg-[#0e0e0f] min-h-screen relative overflow-hidden">
      {/* Ambient Stage Lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Cinematic Header with 5+7 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-12">

          {/* LEFT: 5 cols - Brand & Features */}
          <div className="lg:col-span-5 space-y-8">
            <span className="inline-block px-4 py-1.5 rounded-full border border-[#c39bff]/20 bg-[#c39bff]/5 text-[#c39bff] text-[10px] font-bold tracking-[0.2em] uppercase">
              Step {step} of 4
            </span>

            <h1 className="text-4xl lg:text-5xl font-display font-extrabold tracking-tighter leading-tight text-white">
              {step === 1 && <>Tell us about your <span className="text-transparent bg-gradient-to-r from-[#c39bff] to-[#a1faff] bg-clip-text italic">profile</span></>}
              {step === 2 && <>Define your <span className="text-transparent bg-gradient-to-r from-[#c39bff] to-[#a1faff] bg-clip-text italic">sound</span></>}
              {step === 3 && <>Set your <span className="text-transparent bg-gradient-to-r from-[#c39bff] to-[#a1faff] bg-clip-text italic">rates</span></>}
              {step === 4 && <>Show your <span className="text-transparent bg-gradient-to-r from-[#c39bff] to-[#a1faff] bg-clip-text italic">best work</span></>}
            </h1>

            <p className="text-white/60 text-lg leading-relaxed max-w-md">
              {step === 1 && 'Tell us who you are and where you perform. This is what event companies will see first.'}
              {step === 2 && 'What genres do you play? What events do you rock? Help us match you with the right gigs.'}
              {step === 3 && 'Set your pricing so clients know what to expect. You can always change this later.'}
              {step === 4 && 'Upload photos and videos of your performances. Great media gets more bookings.'}
            </p>

            {/* Progress Dots */}
            <div className="flex items-center gap-3 pt-4">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    s <= step ? 'w-8 bg-[#c39bff]' : 'w-4 bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* RIGHT: 7 cols - Glass Form Card */}
          <div className="lg:col-span-7">
            <div className="glass-card rounded-3xl p-8 lg:p-10 border border-white/5 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#c39bff]/10 blur-3xl rounded-full pointer-events-none" />

              <div className="relative z-10 space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                {/* Step 1: Basic Info */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div className="mb-4 p-3 glass-panel rounded-xl border border-[#a1faff]/20 text-sm text-[#a1faff]">
                      Want to import your profile?{' '}
                      <a href="/artist/onboarding/social" className="font-semibold underline hover:text-white transition-colors">
                        Analyze your social media →
                      </a>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-2">Stage Name *</label>
                      <input
                        type="text"
                        value={stageName}
                        onChange={(e) => setStageName(e.target.value)}
                        className="input-nocturne"
                        placeholder="Your artist/band name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-2">Bio</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={4}
                        className="input-nocturne"
                        placeholder="Tell clients about your act, experience, and what makes you unique..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-2">Base City *</label>
                      <input
                        type="text"
                        value={baseCity}
                        onChange={(e) => setBaseCity(e.target.value)}
                        className="input-nocturne"
                        placeholder="e.g., Mumbai, Delhi, Bangalore"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-2">
                        Travel Radius: <span className="text-[#c39bff]">{travelRadius} km</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={500}
                        step={10}
                        value={travelRadius}
                        onChange={(e) => setTravelRadius(Number(e.target.value))}
                        className="w-full accent-[#c39bff]"
                      />
                      <div className="flex justify-between text-xs text-white/40 mt-2">
                        <span>Local only</span>
                        <span>500 km</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Performance Details */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-3">Genres *</label>
                      <div className="flex flex-wrap gap-2">
                        {GENRES.map((genre) => (
                          <button
                            key={genre}
                            onClick={() => toggleItem(selectedGenres, genre, setSelectedGenres)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                              selectedGenres.includes(genre)
                                ? 'bg-[#c39bff]/20 text-[#c39bff] border-[#c39bff]/40'
                                : 'bg-white/5 text-white/60 border-white/10 hover:border-white/20'
                            }`}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-3">Languages *</label>
                      <div className="flex flex-wrap gap-2">
                        {LANGUAGES.map((lang) => (
                          <button
                            key={lang}
                            onClick={() => toggleItem(selectedLanguages, lang, setSelectedLanguages)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                              selectedLanguages.includes(lang)
                                ? 'bg-[#c39bff]/20 text-[#c39bff] border-[#c39bff]/40'
                                : 'bg-white/5 text-white/60 border-white/10 hover:border-white/20'
                            }`}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-3">Event Types *</label>
                      <div className="flex flex-wrap gap-2">
                        {EVENT_TYPES.map((type) => (
                          <button
                            key={type.value}
                            onClick={() => toggleItem(selectedEventTypes, type.value, setSelectedEventTypes)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                              selectedEventTypes.includes(type.value)
                                ? 'bg-[#c39bff]/20 text-[#c39bff] border-[#c39bff]/40'
                                : 'bg-white/5 text-white/60 border-white/10 hover:border-white/20'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-white/60 mb-2">Min Duration (min)</label>
                        <input
                          type="number"
                          value={durationMin}
                          onChange={(e) => setDurationMin(Number(e.target.value))}
                          min={15}
                          max={480}
                          className="input-nocturne"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/60 mb-2">Max Duration (min)</label>
                        <input
                          type="number"
                          value={durationMax}
                          onChange={(e) => setDurationMax(Number(e.target.value))}
                          min={15}
                          max={480}
                          className="input-nocturne"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Pricing */}
                {step === 3 && (
                  <div className="space-y-4">
                    <p className="text-sm text-white/60">Set price ranges per event type and city tier. Clients will see these as indicative ranges.</p>

                    {pricing.map((entry, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-white/60">Rate #{i + 1}</span>
                          {pricing.length > 1 && (
                            <button onClick={() => removePricingRow(i)} className="text-sm text-red-400 hover:text-red-300">
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-white/40 mb-1">Event Type</label>
                            <select
                              value={entry.event_type}
                              onChange={(e) => updatePricing(i, 'event_type', e.target.value)}
                              className="input-nocturne text-sm"
                            >
                              {EVENT_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-white/40 mb-1">City Tier</label>
                            <select
                              value={entry.city_tier}
                              onChange={(e) => updatePricing(i, 'city_tier', e.target.value)}
                              className="input-nocturne text-sm"
                            >
                              <option value="tier_1">Tier 1 (Metro)</option>
                              <option value="tier_2">Tier 2</option>
                              <option value="tier_3">Tier 3</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-white/40 mb-1">Min (₹)</label>
                            <input
                              type="number"
                              value={entry.min_price}
                              onChange={(e) => updatePricing(i, 'min_price', Number(e.target.value))}
                              min={0}
                              className="input-nocturne text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-white/40 mb-1">Max (₹)</label>
                            <input
                              type="number"
                              value={entry.max_price}
                              onChange={(e) => updatePricing(i, 'max_price', Number(e.target.value))}
                              min={0}
                              className="input-nocturne text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={addPricingRow}
                      className="w-full py-2 border-2 border-dashed border-white/10 rounded-lg text-sm text-white/60 hover:border-[#c39bff] hover:text-[#c39bff] transition-colors"
                    >
                      + Add another rate
                    </button>
                  </div>
                )}

                {/* Step 4: Media Upload */}
                {step === 4 && (
                  <div className="space-y-4">
                    <p className="text-sm text-white/60">
                      Add photos and videos to showcase your performances. This step is optional — you can always add more later from your profile.
                    </p>
                    {profileCreated ? (
                      <MediaUploader media={media} onUpdate={loadMedia} />
                    ) : (
                      <div className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center">
                        <p className="text-white/40 mb-2">Create your profile first to upload media</p>
                        <p className="text-xs text-white/30">Supports: JPG, PNG, MP4 (up to 500MB)</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between gap-4 mt-8 pt-6 border-t border-white/10">
                  <button
                    onClick={() => setStep(Math.max(1, step - 1))}
                    disabled={step === 1 || (step === 4 && profileCreated)}
                    className="px-6 py-3 text-sm font-medium text-white/60 border border-white/10 rounded-full hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Back
                  </button>

                  {step < 3 ? (
                    <button
                      onClick={() => setStep(step + 1)}
                      disabled={!canProceed()}
                      className="px-8 py-3 text-sm font-bold text-white bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] rounded-full shadow-[0_0_20px_rgba(195,155,255,0.2)] hover:shadow-[0_0_30px_rgba(195,155,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest"
                    >
                      Continue
                    </button>
                  ) : step === 3 ? (
                    <button
                      onClick={handleCreateProfile}
                      disabled={isSubmitting || !canProceed()}
                      className="px-8 py-3 text-sm font-bold text-white bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] rounded-full shadow-[0_0_20px_rgba(195,155,255,0.2)] hover:shadow-[0_0_30px_rgba(195,155,255,0.4)] disabled:opacity-50 transition-all uppercase tracking-widest"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Profile'}
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push('/artist')}
                      className="px-8 py-3 text-sm font-bold text-black bg-white rounded-full hover:shadow-xl transition-all uppercase tracking-widest"
                    >
                      {media.length > 0 ? 'Finish' : 'Skip & Finish'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
