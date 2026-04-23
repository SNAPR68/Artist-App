/**
 * DEMO read-only Event File detail. No auth. Shows the vendor roster joined
 * with artist_profiles + bookings — i.e. the headline GRID screen: everyone
 * for this event in one place. For Shows of India stage demo.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface Vendor {
  id: string;
  vendor_profile_id: string;
  booking_id: string | null;
  role: string;
  call_time_override: string | null;
  notes: string | null;
  stage_name: string | null;
  category: string | null;
  base_city: string | null;
  booking_status: string | null;
  booking_amount: number | null;
}

interface DemoEventFile {
  id: string;
  event_name: string;
  event_date: string;
  call_time: string | null;
  city: string;
  venue: string | null;
  brief: unknown;
  status: string;
  budget_paise: number | null;
  vendors: Vendor[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function fetchDemoFile(id: string): Promise<DemoEventFile | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/demo/event-files/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

function cleanName(raw: string): string {
  return raw.replace(/^DEMO:\s*/, '');
}

function formatINR(paise: number | null): string {
  if (paise === null || paise === undefined) return '—';
  const lakhs = paise / 10000000;
  if (lakhs >= 1) return `₹${lakhs.toFixed(1)}L`;
  return `₹${(paise / 100000).toFixed(0)}K`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const CATEGORY_COLORS: Record<string, string> = {
  artist: '#c39bff',
  av: '#a1faff',
  photo: '#ffbf00',
  decor: '#ff8fb1',
  license: '#8affc1',
  promoters: '#ffa373',
  transport: '#9fb3ff',
};

function groupByCategory(vendors: Vendor[]): Record<string, Vendor[]> {
  const groups: Record<string, Vendor[]> = {};
  for (const v of vendors) {
    const key = v.category || 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
  }
  return groups;
}

export default async function DemoEventFileDetail({
  params,
}: {
  params: { id: string };
}) {
  const file = await fetchDemoFile(params.id);
  if (!file) notFound();

  const groups = groupByCategory(file.vendors);
  const totalBudget = file.budget_paise ?? 0;
  const committed = file.vendors.reduce(
    (sum, v) => sum + (Number(v.booking_amount) || 0),
    0,
  );
  const confirmed = file.vendors.filter(
    (v) => v.booking_status === 'CONFIRMED' || v.booking_status === 'EVENT_COMPLETED',
  ).length;

  return (
    <div className="relative min-h-screen">
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-[#c39bff]/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-40 -right-32 w-[500px] h-[500px] bg-[#a1faff]/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-8 py-8 md:py-12">
        <Link
          href="/demo/event-files"
          className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-white/80 transition-colors mb-8"
        >
          <span>←</span> All demo events
        </Link>

        <div className="glass-card rounded-2xl p-8 md:p-12 border border-white/5 mb-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c39bff]/10 border border-[#c39bff]/20">
                <div className="w-1.5 h-1.5 rounded-full bg-[#c39bff] animate-pulse" />
                <span className="text-[10px] tracking-widest uppercase font-bold text-[#c39bff]">
                  {file.status}
                </span>
              </div>
              <span className="text-xs text-white/40 font-mono">{formatDate(file.event_date)}</span>
              {file.call_time && (
                <span className="text-xs text-white/40 font-mono">
                  Call time {file.call_time.slice(0, 5)}
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter text-white mb-4">
              {cleanName(file.event_name)}
            </h1>

            <div className="text-white/50 text-lg mb-8">
              {file.city}
              {file.venue ? ` · ${file.venue}` : ''}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-[10px] tracking-widest uppercase font-bold text-white/40 mb-1">
                  Vendors
                </div>
                <div className="text-3xl font-display font-extrabold text-white">
                  {file.vendors.length}
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-widest uppercase font-bold text-white/40 mb-1">
                  Confirmed
                </div>
                <div className="text-3xl font-display font-extrabold text-[#a1faff]">
                  {confirmed}
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-widest uppercase font-bold text-white/40 mb-1">
                  Committed
                </div>
                <div className="text-3xl font-display font-extrabold text-[#c39bff]">
                  {formatINR(committed * 100)}
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-widest uppercase font-bold text-white/40 mb-1">
                  Budget
                </div>
                <div className="text-3xl font-display font-extrabold text-[#ffbf00]">
                  {formatINR(totalBudget)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-display font-extrabold tracking-tight text-white">
            Vendor roster
          </h2>
          <div className="text-xs text-white/40">
            Grouped by category
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(groups).map(([category, list]) => {
            const color = CATEGORY_COLORS[category] ?? '#ffffff80';
            return (
              <div key={category} className="glass-card rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
                    />
                    <span
                      className="text-xs tracking-widest uppercase font-bold"
                      style={{ color }}
                    >
                      {category}
                    </span>
                    <span className="text-xs text-white/40">· {list.length}</span>
                  </div>
                </div>
                <div className="divide-y divide-white/5">
                  {list.map((v) => (
                    <div
                      key={v.id}
                      className="px-6 py-4 flex flex-wrap items-center gap-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex-1 min-w-[200px]">
                        <div className="text-white font-medium">
                          {v.stage_name || 'Unnamed vendor'}
                        </div>
                        <div className="text-white/40 text-xs mt-0.5">
                          {v.role}
                          {v.base_city ? ` · ${v.base_city}` : ''}
                        </div>
                      </div>
                      {v.call_time_override && (
                        <div className="text-xs font-mono text-white/60">
                          Call {v.call_time_override.slice(0, 5)}
                        </div>
                      )}
                      {v.booking_status && (
                        <div
                          className="text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: `${color}15`,
                            color,
                          }}
                        >
                          {v.booking_status}
                        </div>
                      )}
                      {v.booking_amount !== null && (
                        <div className="text-sm font-mono text-white/80 min-w-[80px] text-right">
                          {formatINR(Number(v.booking_amount) * 100)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Call sheet', sub: 'SMS + WhatsApp + Email in one tap', color: '#c39bff' },
            { label: 'Consolidated rider', sub: 'All vendor riders, merged PDF + Excel', color: '#a1faff' },
            { label: 'BOQ', sub: 'Bill of quantities, auto-seeded from roster', color: '#ffbf00' },
          ].map((x) => (
            <div
              key={x.label}
              className="glass-card rounded-xl p-5 border border-white/5 relative overflow-hidden"
            >
              <div
                className="absolute -top-12 -right-12 w-32 h-32 blur-[60px] rounded-full pointer-events-none"
                style={{ backgroundColor: `${x.color}20` }}
              />
              <div className="relative">
                <div
                  className="text-[10px] tracking-widest uppercase font-bold mb-2"
                  style={{ color: x.color }}
                >
                  Ready to generate
                </div>
                <div className="text-white font-bold mb-1">{x.label}</div>
                <div className="text-white/40 text-xs">{x.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 glass-card rounded-2xl p-8 md:p-10 border border-white/5 relative overflow-hidden text-center">
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#a1faff]/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative">
            <h3 className="text-2xl md:text-3xl font-display font-extrabold tracking-tighter text-white mb-2">
              This is what one file looks like.
            </h3>
            <p className="text-white/50 mb-6">
              Your next event could run on GRID. Free for 90 days.
            </p>
            <Link
              href="/pilot"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#c39bff] text-[#0e0e0f] font-bold text-sm hover:bg-white transition-colors"
            >
              Apply for pilot
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
