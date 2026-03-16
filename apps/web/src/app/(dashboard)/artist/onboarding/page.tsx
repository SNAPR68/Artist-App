'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import { MediaUploader } from '../../../../components/media/MediaUploader';

const EVENT_TYPES = [
  'Wedding', 'Corporate', 'Birthday', 'College Fest', 'Concert',
  'Private Party', 'Festival', 'Club Night', 'Restaurant', 'Other',
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
    { event_type: 'Wedding', city_tier: 'tier_1', min_price: 50000, max_price: 200000 },
  ]);

  // Step 4: Media
  const [media, setMedia] = useState<Array<{ id: string; media_type: 'image' | 'video'; original_url: string; thumbnail_url?: string; transcode_status: string; sort_order: number }>>([]);
  const [profileCreated, setProfileCreated] = useState(false);

  const toggleItem = (list: string[], item: string, setter: (v: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const addPricingRow = () => {
    setPricing([...pricing, { event_type: 'Wedding', city_tier: 'tier_1', min_price: 0, max_price: 0 }]);
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
    // Media is fetched via the artist profile endpoint
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
      case 4: return true; // Media is optional at creation
      default: return false;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          {['Basic Info', 'Performance', 'Pricing', 'Media'].map((label, i) => (
            <span
              key={label}
              className={`${i + 1 <= step ? 'text-primary-500 font-medium' : ''}`}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Tell us about yourself</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage Name *</label>
            <input
              type="text"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Your artist/band name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Tell clients about your act, experience, and what makes you unique..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base City *</label>
            <input
              type="text"
              value={baseCity}
              onChange={(e) => setBaseCity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Mumbai, Delhi, Bangalore"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Travel Radius: {travelRadius} km
            </label>
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={travelRadius}
              onChange={(e) => setTravelRadius(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Local only</span>
              <span>500 km</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Performance Details */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Performance Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Genres *</label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() => toggleItem(selectedGenres, genre, setSelectedGenres)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedGenres.includes(genre)
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Languages *</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => toggleItem(selectedLanguages, lang, setSelectedLanguages)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedLanguages.includes(lang)
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Types *</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleItem(selectedEventTypes, type, setSelectedEventTypes)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedEventTypes.includes(type)
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Duration (min)</label>
              <input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                min={15}
                max={480}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Duration (min)</label>
              <input
                type="number"
                value={durationMax}
                onChange={(e) => setDurationMax(Number(e.target.value))}
                min={15}
                max={480}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Pricing Matrix */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Set Your Pricing</h2>
          <p className="text-sm text-gray-500">Set price ranges per event type and city tier. Clients will see these as indicative ranges.</p>

          {pricing.map((entry, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Rate #{i + 1}</span>
                {pricing.length > 1 && (
                  <button onClick={() => removePricingRow(i)} className="text-sm text-red-500 hover:text-red-700">
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Event Type</label>
                  <select
                    value={entry.event_type}
                    onChange={(e) => updatePricing(i, 'event_type', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">City Tier</label>
                  <select
                    value={entry.city_tier}
                    onChange={(e) => updatePricing(i, 'city_tier', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  >
                    <option value="tier_1">Tier 1 (Metro)</option>
                    <option value="tier_2">Tier 2</option>
                    <option value="tier_3">Tier 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min Price (INR)</label>
                  <input
                    type="number"
                    value={entry.min_price}
                    onChange={(e) => updatePricing(i, 'min_price', Number(e.target.value))}
                    min={0}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Price (INR)</label>
                  <input
                    type="number"
                    value={entry.max_price}
                    onChange={(e) => updatePricing(i, 'max_price', Number(e.target.value))}
                    min={0}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addPricingRow}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-300 hover:text-primary-500 transition-colors"
          >
            + Add another rate
          </button>
        </div>
      )}

      {/* Step 4: Media Upload */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Upload Media</h2>
          <p className="text-sm text-gray-500">
            Add photos and videos to showcase your performances. This step is optional — you can always add more later from your profile.
          </p>
          {profileCreated ? (
            <MediaUploader media={media} onUpdate={loadMedia} />
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-gray-400 mb-2">Create your profile first to upload media</p>
              <p className="text-xs text-gray-400">Supports: JPG, PNG, MP4 (up to 500MB)</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1 || (step === 4 && profileCreated)}
          className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="px-6 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        ) : step === 3 ? (
          <button
            onClick={handleCreateProfile}
            disabled={isSubmitting || !canProceed()}
            className="px-6 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Profile & Continue'}
          </button>
        ) : (
          <button
            onClick={() => router.push('/artist')}
            className="px-6 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
          >
            {media.length > 0 ? 'Finish' : 'Skip & Finish'}
          </button>
        )}
      </div>
    </div>
  );
}
