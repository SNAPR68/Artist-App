'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import { ArtistCoverSection } from '../../../../components/artist/ArtistCoverSection';
import { ArtistGallery } from '../../../../components/artist/ArtistGallery';
import { ArtistPricingCards } from '../../../../components/artist/ArtistPricingCards';
import { ArtistReviews } from '../../../../components/artist/ArtistReviews';
import { AvailabilityCalendar } from '../../../../components/artist/AvailabilityCalendar';
import { AnimatedSection } from '../../../../components/shared/AnimatedSection';
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
    }).catch((err) => {
      console.error('[ArtistPage] Failed to load data:', err);
      setError('Failed to load artist profile. Please try again.');
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nocturne-accent" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-display font-bold text-nocturne-text-primary">Artist not found</h1>
        <p className="text-nocturne-text-secondary mt-2">This artist profile doesn&apos;t exist or is no longer active.</p>
      </div>
    );
  }

  const pricing = typeof profile.pricing === 'string' ? JSON.parse(profile.pricing) : profile.pricing;
  const coverUrl = profile.media.find(m => m.media_type === 'image')?.cdn_url ?? profile.media.find(m => m.media_type === 'image')?.original_url;

  return (
    <div className="theme-nocturne bg-[#0e0e0f] min-h-screen">
      {/* ─── Cinematic Hero ─── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full" />
          <div className="absolute top-20 right-0 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full" />
        </div>
        <ArtistCoverSection
          stageName={profile.stage_name}
          baseCity={profile.base_city}
          travelRadiusKm={profile.travel_radius_km}
          trustScore={profile.trust_score}
          isVerified={profile.is_verified}
          coverUrl={coverUrl}
        />
      </div>

      <div className="max-w-section mx-auto px-4 sm:px-6 py-8 lg:grid lg:grid-cols-[1fr_340px] lg:gap-8">
      <div>
        {/* Gallery */}
        <ArtistGallery media={profile.media} artistName={profile.stage_name} />

        {/* Bio */}
        {profile.bio && (
          <AnimatedSection>
            <div className="glass-card p-8 mb-8 border border-nocturne-border">
              <h2 className="text-lg font-display font-semibold text-nocturne-text-primary mb-2">About</h2>
              <p className="text-sm text-nocturne-text-secondary leading-relaxed">{profile.bio}</p>
            </div>
          </AnimatedSection>
        )}

        {/* Details Grid */}
        <AnimatedSection delay={0.1}>
          <div className="glass-card p-8 grid grid-cols-2 gap-6 mb-8 border border-nocturne-border">
            <div>
              <h3 className="text-xs font-semibold text-nocturne-text-secondary uppercase tracking-wider mb-2">Genres</h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.genres.map((g) => (
                  <span key={g} className="badge-nocturne px-2.5 py-1 rounded-full text-nocturne-accent text-xs">
                    {g}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-nocturne-text-secondary uppercase tracking-wider mb-2">Event Types</h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.event_types.map((t) => (
                  <span key={t} className="badge-nocturne px-2.5 py-1 rounded-full text-nocturne-accent text-xs">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-nocturne-text-secondary uppercase tracking-wider mb-2">Languages</h3>
              <p className="text-sm text-nocturne-text-secondary">{profile.languages.join(', ')}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-nocturne-text-secondary uppercase tracking-wider mb-2">Duration</h3>
              <p className="text-sm text-nocturne-text-secondary">{profile.performance_duration_min}–{profile.performance_duration_max} minutes</p>
            </div>
          </div>
        </AnimatedSection>

        {/* Stats — Cinematic Bento */}
        <AnimatedSection delay={0.15}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Bookings', value: String(profile.total_bookings ?? 0), color: 'text-[#a1faff]' },
              { label: 'Acceptance', value: `${profile.acceptance_rate ?? 0}%`, color: 'text-[#c39bff]' },
              { label: 'Response', value: `${profile.avg_response_time_hours ?? '-'}h`, color: 'text-[#ffbf00]' },
              { label: 'Profile', value: `${profile.profile_completion_pct}%`, color: 'text-green-400' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-5 text-center border border-white/5 hover:border-white/15 transition-all">
                <p className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mt-1 font-bold">{stat.label}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>

        {/* Pricing */}
        {Array.isArray(pricing) && pricing.length > 0 && (
          <ArtistPricingCards pricing={pricing} />
        )}

        {/* Reviews */}
        <ArtistReviews reviews={profile.reviews} />

        {/* Availability */}
        <AvailabilityCalendar availability={availability} />
      </div>

      {/* Sidebar: Booking Inquiry Form */}
      <aside className="mt-8 lg:mt-0">
        <div className="lg:sticky lg:top-24">
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
