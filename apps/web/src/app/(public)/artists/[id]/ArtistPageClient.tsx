'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';
import { ArtistGallery } from '../../../../components/artist/ArtistGallery';
import { ArtistPricingCards } from '../../../../components/artist/ArtistPricingCards';
import { ArtistReviews } from '../../../../components/artist/ArtistReviews';
import { AvailabilityCalendar } from '../../../../components/artist/AvailabilityCalendar';
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
      <div className="flex items-center justify-center min-h-screen bg-[#0e0e0f]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-20 bg-[#0e0e0f] min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-display font-bold text-white">Artist not found</h1>
        <p className="text-white/50 mt-2">This artist profile doesn&apos;t exist or is no longer active.</p>
        <Link href="/search" className="mt-6 px-6 py-3 bg-[#c39bff] text-[#320067] font-bold rounded-full">Browse Artists</Link>
      </div>
    );
  }

  const pricing = typeof profile.pricing === 'string' ? JSON.parse(profile.pricing) : profile.pricing;
  const images = profile.media.filter(m => m.media_type === 'image');
  const coverUrl = images[0]?.cdn_url ?? images[0]?.original_url;

  return (
    <div className="bg-[#0e0e0f] min-h-screen text-white">
      {/* ─── Ambient Stage Lighting ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[500px] h-[500px] bg-[#c39bff]/8 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] bg-[#a1faff]/5 blur-[100px] rounded-full" />
      </div>

      <main className="relative z-10 pt-32 pb-20 px-6 md:px-12 max-w-screen-2xl mx-auto">
        {/* ─── Editorial Hero Headline ─── */}
        <header className="mb-20 text-center md:text-left">
          <div className="flex items-center gap-3 mb-6 justify-center md:justify-start">
            {profile.is_verified && (
              <span className="px-3 py-1 bg-[#c39bff]/15 text-[#c39bff] text-[10px] font-bold tracking-widest uppercase rounded-full border border-[#c39bff]/20">
                Verified Artist
              </span>
            )}
            <span className="px-3 py-1 bg-white/5 text-white/50 text-[10px] font-bold tracking-widest uppercase rounded-full border border-white/10">
              {profile.base_city}
            </span>
          </div>
          <h1 className="font-display font-extrabold text-5xl md:text-8xl tracking-tight leading-tight mb-6">
            {profile.stage_name.split(' ').map((word, i) => (
              <span key={i}>
                {i === 0 ? word : <span className="text-[#c39bff] italic"> {word}</span>}
              </span>
            ))}
          </h1>
          <p className="text-white/50 text-lg md:text-xl max-w-2xl tracking-wide">
            {profile.bio || `${profile.genres.join(', ')} artist based in ${profile.base_city}. Available for bookings across India.`}
          </p>
        </header>

        {/* ─── Cinematic 3D Poster Gallery ─── */}
        {images.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-32" style={{ perspective: '2000px' }}>
            {images.slice(0, 3).map((img, i) => (
              <div
                key={img.id}
                className="relative group"
                style={{ marginTop: i === 1 ? '6rem' : i === 2 ? '12rem' : '0' }}
              >
                <div
                  className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl shadow-purple-900/20 bg-[#201f21] border border-white/5 transition-all duration-700 group-hover:shadow-[0_20px_60px_rgba(195,155,255,0.3)]"
                  style={{
                    transform: 'rotateY(-15deg) rotateX(5deg)',
                    transition: 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'rotateY(0deg) rotateX(0deg) scale(1.05)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'rotateY(-15deg) rotateX(5deg)'; }}
                >
                  <Image
                    src={img.cdn_url ?? img.original_url}
                    alt={profile.stage_name}
                    fill
                    className="object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                  <div className="absolute bottom-8 left-8">
                    <span className="text-[#c39bff] text-xs tracking-widest uppercase mb-2 block font-bold">
                      {profile.genres[i] ?? profile.genres[0]}
                    </span>
                    <h3 className="text-3xl font-bold tracking-tight">{profile.stage_name}</h3>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ─── Full Gallery (if more than 3 images) ─── */}
        {images.length > 3 && (
          <ArtistGallery media={profile.media} artistName={profile.stage_name} />
        )}

        {/* ─── High-Gloss Bento Stats Grid ─── */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-32">
          <div className="md:col-span-2 p-10 rounded-xl border border-white/5 flex flex-col justify-between h-[400px]" style={{ background: 'rgba(32,31,31,0.4)', backdropFilter: 'blur(40px)' }}>
            <div>
              <div className="text-[#c39bff] text-5xl mb-6">&#10024;</div>
              <h2 className="text-4xl font-bold mb-4 tracking-tight">{profile.stage_name}</h2>
              <p className="text-white/50 leading-relaxed">{profile.bio || 'A talented performer bringing unforgettable experiences to every event.'}</p>
            </div>
            <div className="flex gap-4 flex-wrap">
              {profile.genres.map(g => (
                <span key={g} className="px-4 py-1 rounded-full border border-white/10 text-xs tracking-tighter uppercase font-medium text-white/70">{g}</span>
              ))}
            </div>
          </div>

          <div className="bg-[#201f21] p-10 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center h-[400px]">
            <div className="text-6xl font-black text-[#ffbf00] mb-4">{profile.total_bookings}</div>
            <div className="uppercase tracking-[0.2em] text-sm font-bold text-white/50">Total Bookings</div>
            <div className="mt-6 text-4xl font-black text-[#a1faff]">{profile.trust_score != null ? Number(profile.trust_score).toFixed(1) : '—'}</div>
            <div className="uppercase tracking-[0.2em] text-sm font-bold text-white/50 mt-1">Trust Score</div>
          </div>

          <div className="p-10 rounded-xl border border-white/5 relative overflow-hidden group h-[400px]" style={{ background: 'rgba(32,31,31,0.4)', backdropFilter: 'blur(40px)' }}>
            {coverUrl && (
              <Image
                src={coverUrl}
                alt="Background"
                fill
                className="object-cover opacity-20 group-hover:scale-110 transition-transform duration-1000"
              />
            )}
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                <h4 className="text-xl font-bold mb-4">Quick Stats</h4>
                <div className="space-y-3 text-sm text-white/50">
                  <div className="flex justify-between"><span>Acceptance Rate</span><span className="text-white font-bold">{Math.round(Number(profile.acceptance_rate ?? 0))}%</span></div>
                  <div className="flex justify-between"><span>Response Time</span><span className="text-white font-bold">{profile.avg_response_time_hours ?? '—'}h</span></div>
                  <div className="flex justify-between"><span>Duration</span><span className="text-white font-bold">{profile.performance_duration_min}–{profile.performance_duration_max} min</span></div>
                  <div className="flex justify-between"><span>Languages</span><span className="text-white font-bold">{profile.languages.join(', ')}</span></div>
                  <div className="flex justify-between"><span>Travel</span><span className="text-white font-bold">{profile.travel_radius_km} km</span></div>
                </div>
              </div>
              <Link href="#book" className="mt-4 text-[#ffbf00] flex items-center gap-2 group/btn font-bold">
                Book Now <span className="group-hover/btn:translate-x-2 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Content: 8+4 Split ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 mb-32">
          <div className="space-y-8">
            {/* Pricing */}
            {Array.isArray(pricing) && pricing.length > 0 && (
              <ArtistPricingCards pricing={pricing} />
            )}

            {/* Reviews */}
            <ArtistReviews reviews={profile.reviews} />

            {/* Availability */}
            <AvailabilityCalendar availability={availability} />
          </div>

          {/* Sidebar: Sticky Booking Form */}
          <aside id="book">
            <div className="lg:sticky lg:top-24">
              <BookingInquiryForm
                artistId={id}
                artistName={profile.stage_name}
                eventTypes={profile.event_types}
              />
            </div>
          </aside>
        </div>

        {/* ─── CTA Stage ─── */}
        <section className="relative py-24 rounded-xl overflow-hidden bg-[#131314] border border-white/5 text-center mb-20">
          <div className="absolute inset-0 bg-[#c39bff]/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto px-6">
            <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-8">
              Want {profile.stage_name.split(' ')[0]} at your <span className="text-[#c39bff]">event</span>?
            </h2>
            <p className="text-white/50 mb-12 text-lg">
              Send a booking inquiry and get a response within {profile.avg_response_time_hours ?? 24} hours. Secure payments through escrow.
            </p>
            <a
              href="#book"
              className="inline-block bg-white text-black font-black uppercase text-sm tracking-widest px-10 py-4 rounded-full hover:bg-[#c39bff] hover:text-white transition-colors"
            >
              Send Inquiry
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
