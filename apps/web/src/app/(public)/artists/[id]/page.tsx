'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import BookingInquiryForm from '../../../../components/booking/BookingInquiryForm';

interface PublicArtistProfile {
  id: string;
  stage_name: string;
  bio: string;
  genres: string[];
  languages: string[];
  base_city: string;
  travel_radius_km: number;
  event_types: string[];
  performance_duration_min: number;
  performance_duration_max: number;
  pricing: string;
  trust_score: number;
  total_bookings: number;
  acceptance_rate: number;
  avg_response_time_hours: number;
  is_verified: boolean;
  profile_completion_pct: number;
  media: Array<{
    id: string;
    media_type: 'image' | 'video';
    original_url: string;
    thumbnail_url?: string;
    cdn_url?: string;
  }>;
  reviews: Array<{
    overall_rating: number;
    comment: string;
    created_at: string;
  }>;
}

interface AvailabilityEntry {
  date: string;
  status: 'available' | 'unavailable';
}

export default function PublicArtistPage() {
  const params = useParams();
  const id = params.id as string;
  const [profile, setProfile] = useState<PublicArtistProfile | null>(null);
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiClient<PublicArtistProfile>(`/v1/artists/${id}`),
      apiClient<AvailabilityEntry[]>(`/v1/artists/${id}/availability`),
    ]).then(([profileRes, availRes]) => {
      if (profileRes.success) {
        setProfile(profileRes.data);
      } else {
        setError('Artist not found');
      }
      if (availRes.success) {
        setAvailability(availRes.data);
      }
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900">Artist not found</h1>
        <p className="text-gray-500 mt-2">This artist profile doesn't exist or is no longer active.</p>
      </div>
    );
  }

  const pricing = typeof profile.pricing === 'string' ? JSON.parse(profile.pricing) : profile.pricing;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 lg:grid lg:grid-cols-[1fr_340px] lg:gap-8">
    <div>
      {/* Hero Section */}
      <div className="mb-8">
        {/* Media Gallery */}
        {profile.media.length > 0 && (
          <div className="grid grid-cols-3 gap-2 rounded-xl overflow-hidden mb-6">
            {profile.media.slice(0, 3).map((item, i) => (
              <div
                key={item.id}
                className={`aspect-video bg-gray-200 ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
              >
                {item.media_type === 'image' ? (
                  <img
                    src={item.cdn_url ?? item.original_url}
                    alt={profile.stage_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
                    ▶ Video
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900">{profile.stage_name}</h1>
              {profile.is_verified && (
                <span className="bg-primary-100 text-primary-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  Verified
                </span>
              )}
            </div>
            <p className="text-gray-500 mt-1">{profile.base_city} · Travels up to {profile.travel_radius_km} km</p>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-primary-500">{profile.trust_score ?? 0}</div>
            <p className="text-xs text-gray-500">Trust Score</p>
          </div>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">About</h2>
          <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Genres</h3>
          <div className="flex flex-wrap gap-1">
            {profile.genres.map((g) => (
              <span key={g} className="bg-primary-50 text-primary-700 text-sm px-3 py-1 rounded-full">{g}</span>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Event Types</h3>
          <div className="flex flex-wrap gap-1">
            {profile.event_types.map((t) => (
              <span key={t} className="bg-secondary-50 text-secondary-700 text-sm px-3 py-1 rounded-full">{t}</span>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Languages</h3>
          <p className="text-gray-700">{profile.languages.join(', ')}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Duration</h3>
          <p className="text-gray-700">{profile.performance_duration_min}–{profile.performance_duration_max} minutes</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Bookings', value: profile.total_bookings ?? 0 },
          { label: 'Acceptance', value: `${profile.acceptance_rate ?? 0}%` },
          { label: 'Response', value: `${profile.avg_response_time_hours ?? '-'}h` },
          { label: 'Profile', value: `${profile.profile_completion_pct}%` },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Pricing */}
      {Array.isArray(pricing) && pricing.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Pricing</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Event Type</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">City Tier</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500">Price Range</th>
                </tr>
              </thead>
              <tbody>
                {pricing.map((p: { event_type: string; city_tier: string; min_price: number; max_price: number }, i: number) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-4 py-2">{p.event_type}</td>
                    <td className="px-4 py-2 capitalize">{p.city_tier?.replace('_', ' ')}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      ₹{(p.min_price / 100).toLocaleString('en-IN')} – ₹{(p.max_price / 100).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reviews */}
      {profile.reviews.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Reviews</h2>
          <div className="space-y-3">
            {profile.reviews.map((review, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-500">{'★'.repeat(review.overall_rating)}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(review.created_at).toLocaleDateString('en-IN')}
                  </span>
                </div>
                {review.comment && <p className="text-gray-700 text-sm">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Availability Preview */}
      {availability.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Upcoming Availability</h2>
          <div className="flex flex-wrap gap-1">
            {availability.slice(0, 30).map((entry) => (
              <div
                key={entry.date}
                className={`w-8 h-8 rounded flex items-center justify-center text-xs ${
                  entry.status === 'available'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
                title={`${entry.date}: ${entry.status}`}
              >
                {new Date(entry.date).getDate()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

      {/* Sidebar: Booking Inquiry Form */}
      <aside className="mt-8 lg:mt-0">
        <div className="lg:sticky lg:top-8">
          <BookingInquiryForm
            artistId={id}
            artistName={profile.stage_name}
            eventTypes={profile.event_types}
          />
        </div>
      </aside>
    </div>
  );
}
