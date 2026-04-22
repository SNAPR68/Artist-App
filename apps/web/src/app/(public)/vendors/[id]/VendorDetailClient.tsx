'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Music2,
  Speaker,
  Camera,
  Flower2,
  ScrollText,
  Megaphone,
  Truck,
  MapPin,
  Star,
  CheckCircle2,
  Phone,
  ChevronLeft,
  Mic2,
  Clock,
  Users,
  Package,
  Palette,
  Layers,
} from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

type VendorCategory = 'artist' | 'av' | 'photo' | 'decor' | 'license' | 'promoters' | 'transport';

interface Vendor {
  id: string;
  stage_name: string;
  bio: string | null;
  base_city: string;
  category: VendorCategory;
  category_attributes: Record<string, unknown> | null;
  trust_score: number;
  total_bookings: number;
  is_verified: boolean;
  profile_completion_pct: number;
  created_at: string;
}

const CATEGORY_META: Record<VendorCategory, { label: string; icon: React.ReactNode; accent: string }> = {
  artist:    { label: 'Artist',    icon: <Music2 size={16} />,    accent: '#c39bff' },
  av:        { label: 'AV',         icon: <Speaker size={16} />,   accent: '#a1faff' },
  photo:     { label: 'Photo',      icon: <Camera size={16} />,    accent: '#ffbf00' },
  decor:     { label: 'Decor',      icon: <Flower2 size={16} />,   accent: '#6ee7b7' },
  license:   { label: 'License',    icon: <ScrollText size={16} />, accent: '#fdba74' },
  promoters: { label: 'Promoters',  icon: <Megaphone size={16} />, accent: '#f9a8d4' },
  transport: { label: 'Transport',  icon: <Truck size={16} />,     accent: '#7dd3fc' },
};

function AttrRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-white/40 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white/40 uppercase tracking-wider font-bold">{label}</div>
        <div className="text-sm text-white/80 mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function Tags({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span key={t} className="nocturne-chip text-xs bg-white/5 border-white/10 text-white/60">
          {t}
        </span>
      ))}
    </div>
  );
}

function ArtistAttributes({ a }: { a: Record<string, unknown> }) {
  return (
    <>
      {a.act_type && <AttrRow icon={<Mic2 size={14} />} label="Act Type" value={String(a.act_type)} />}
      {a.set_duration_min && <AttrRow icon={<Clock size={14} />} label="Set Duration" value={`${a.set_duration_min} min`} />}
      {Array.isArray(a.genre_tags) && a.genre_tags.length > 0 && (
        <AttrRow icon={<Music2 size={14} />} label="Genres" value={<Tags items={a.genre_tags as string[]} />} />
      )}
    </>
  );
}

function AvAttributes({ a }: { a: Record<string, unknown> }) {
  return (
    <>
      {a.crew_count && <AttrRow icon={<Users size={14} />} label="Crew Count" value={String(a.crew_count)} />}
      {Array.isArray(a.stage_sizes_supported) && a.stage_sizes_supported.length > 0 && (
        <AttrRow icon={<Layers size={14} />} label="Stage Sizes" value={<Tags items={a.stage_sizes_supported as string[]} />} />
      )}
      {Array.isArray(a.gear_inventory) && a.gear_inventory.length > 0 && (
        <AttrRow icon={<Package size={14} />} label="Gear" value={<Tags items={a.gear_inventory as string[]} />} />
      )}
    </>
  );
}

function PhotoAttributes({ a }: { a: Record<string, unknown> }) {
  return (
    <>
      {a.package_hours && <AttrRow icon={<Clock size={14} />} label="Package Hours" value={`${a.package_hours}h`} />}
      {a.turnaround_days && <AttrRow icon={<Clock size={14} />} label="Turnaround" value={`${a.turnaround_days} days`} />}
      {Array.isArray(a.deliverables) && a.deliverables.length > 0 && (
        <AttrRow icon={<Package size={14} />} label="Deliverables" value={<Tags items={a.deliverables as string[]} />} />
      )}
      {Array.isArray(a.style_tags) && a.style_tags.length > 0 && (
        <AttrRow icon={<Palette size={14} />} label="Style" value={<Tags items={a.style_tags as string[]} />} />
      )}
    </>
  );
}

function DecorAttributes({ a }: { a: Record<string, unknown> }) {
  return (
    <>
      {a.setup_hours && <AttrRow icon={<Clock size={14} />} label="Setup Time" value={`${a.setup_hours}h`} />}
      {(a.min_guest_count || a.max_guest_count) && (
        <AttrRow
          icon={<Users size={14} />}
          label="Guest Range"
          value={`${a.min_guest_count ?? '—'} – ${a.max_guest_count ?? '—'}`}
        />
      )}
      {Array.isArray(a.style_tags) && a.style_tags.length > 0 && (
        <AttrRow icon={<Palette size={14} />} label="Style" value={<Tags items={a.style_tags as string[]} />} />
      )}
    </>
  );
}

function LicenseAttributes({ a }: { a: Record<string, unknown> }) {
  return (
    <>
      {Array.isArray(a.license_types) && a.license_types.length > 0 && (
        <AttrRow icon={<ScrollText size={14} />} label="License Types" value={<Tags items={a.license_types as string[]} />} />
      )}
      {Array.isArray(a.cities_covered) && a.cities_covered.length > 0 && (
        <AttrRow icon={<MapPin size={14} />} label="Cities Covered" value={<Tags items={a.cities_covered as string[]} />} />
      )}
      {a.turnaround_days && <AttrRow icon={<Clock size={14} />} label="Turnaround" value={`${a.turnaround_days} days`} />}
    </>
  );
}

function PromotersAttributes({ a }: { a: Record<string, unknown> }) {
  return (
    <>
      {Array.isArray(a.channels) && a.channels.length > 0 && (
        <AttrRow icon={<Megaphone size={14} />} label="Channels" value={<Tags items={a.channels as string[]} />} />
      )}
      {Array.isArray(a.cities_covered) && a.cities_covered.length > 0 && (
        <AttrRow icon={<MapPin size={14} />} label="Cities" value={<Tags items={a.cities_covered as string[]} />} />
      )}
    </>
  );
}

function TransportAttributes({ a }: { a: Record<string, unknown> }) {
  return (
    <>
      {Array.isArray(a.vehicle_types) && a.vehicle_types.length > 0 && (
        <AttrRow icon={<Truck size={14} />} label="Vehicles" value={<Tags items={a.vehicle_types as string[]} />} />
      )}
      {a.fleet_size && <AttrRow icon={<Layers size={14} />} label="Fleet Size" value={String(a.fleet_size)} />}
      {Array.isArray(a.cities_covered) && a.cities_covered.length > 0 && (
        <AttrRow icon={<MapPin size={14} />} label="Coverage" value={<Tags items={a.cities_covered as string[]} />} />
      )}
    </>
  );
}

function CategoryAttributes({ category, attrs }: { category: VendorCategory; attrs: Record<string, unknown> }) {
  switch (category) {
    case 'artist':    return <ArtistAttributes a={attrs} />;
    case 'av':        return <AvAttributes a={attrs} />;
    case 'photo':     return <PhotoAttributes a={attrs} />;
    case 'decor':     return <DecorAttributes a={attrs} />;
    case 'license':   return <LicenseAttributes a={attrs} />;
    case 'promoters': return <PromotersAttributes a={attrs} />;
    case 'transport': return <TransportAttributes a={attrs} />;
    default:          return null;
  }
}

export default function VendorDetailClient() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient<Vendor>(`/v1/vendors/${id}`)
      .then((res) => {
        if (!res.success) {
          setError(res.errors?.[0]?.message || 'Vendor not found');
          return;
        }
        setVendor(res.data as unknown as Vendor);
      })
      .catch((e) => setError(e?.message || 'Network error'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0f] flex items-center justify-center">
        <div className="nocturne-skeleton w-full max-w-3xl h-64 rounded-xl mx-6" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-[#0e0e0f] flex items-center justify-center text-red-300 px-6">
        {error || 'Vendor not found'}
      </div>
    );
  }

  const meta = CATEGORY_META[vendor.category];
  const attrs = vendor.category_attributes ?? {};
  const hasAttrs = Object.keys(attrs).length > 0;

  return (
    <div className="min-h-screen bg-[#0e0e0f] text-white">
      {/* Back */}
      <div className="max-w-4xl mx-auto px-6 pt-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/80 transition mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Hero card */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        <div className="glass-card rounded-2xl border border-white/5 overflow-hidden relative">
          {/* Glow */}
          <div
            className="absolute -top-20 -right-20 w-64 h-64 blur-[100px] rounded-full pointer-events-none opacity-30"
            style={{ backgroundColor: meta.accent }}
          />

          {/* Header */}
          <div className="p-8 border-b border-white/5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border mb-3"
                  style={{ color: meta.accent, borderColor: `${meta.accent}40`, backgroundColor: `${meta.accent}15` }}
                >
                  {meta.icon} {meta.label}
                </div>
                <h1 className="font-display text-4xl font-extrabold tracking-tighter">
                  {vendor.stage_name}
                </h1>
                <div className="flex items-center gap-4 mt-3 text-sm text-white/50">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> {vendor.base_city}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-[#ffbf00]" />
                    {Number(vendor.trust_score ?? 0).toFixed(1)} trust score
                  </span>
                  {vendor.total_bookings > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> {vendor.total_bookings} bookings
                    </span>
                  )}
                </div>
              </div>
              {vendor.is_verified && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </div>
              )}
            </div>

            {vendor.bio && (
              <p className="mt-5 text-white/60 leading-relaxed max-w-2xl">{vendor.bio}</p>
            )}
          </div>

          {/* Category attributes */}
          {hasAttrs && (
            <div className="p-8 border-b border-white/5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">
                {meta.label} Details
              </h2>
              <div className="divide-y divide-white/5">
                <CategoryAttributes category={vendor.category} attrs={attrs} />
              </div>
            </div>
          )}

          {/* Stats + CTA */}
          <div className="p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex gap-8">
              <div>
                <div className="text-2xl font-extrabold font-display">{vendor.profile_completion_pct}%</div>
                <div className="text-xs text-white/40 uppercase tracking-wider">Profile</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold font-display">
                  {Number(vendor.trust_score ?? 0).toFixed(1)}
                </div>
                <div className="text-xs text-white/40 uppercase tracking-wider">Trust Score</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold font-display">{vendor.total_bookings}</div>
                <div className="text-xs text-white/40 uppercase tracking-wider">Bookings</div>
              </div>
            </div>

            <button
              className="btn-nocturne-primary flex items-center gap-2 px-6 py-3"
              onClick={() => router.push(`/brief?vendor=${vendor.id}&category=${vendor.category}`)}
            >
              <Mic2 className="w-4 h-4" /> Book via Voice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
