/**
 * DEMO: Public Event File showcase for Shows of India (2026-05-01).
 * No auth. Fetches only DEMO:-prefixed files. Stage-safe — intended for
 * projector walkthrough in front of event companies + artist managers.
 */
import Link from 'next/link';

interface DemoEventFile {
  id: string;
  event_name: string;
  event_date: string;
  call_time: string | null;
  city: string;
  venue: string | null;
  status: string;
  budget_paise: number | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function fetchDemoFiles(): Promise<DemoEventFile[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/demo/event-files`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data ?? [];
  } catch {
    return [];
  }
}

function cleanName(raw: string): string {
  return raw.replace(/^DEMO:\s*/, '');
}

function formatINR(paise: number | null): string {
  if (!paise) return '—';
  const lakhs = paise / 10000000;
  return `₹${lakhs.toFixed(1)}L`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function DemoEventFilesPage() {
  const files = await fetchDemoFiles();

  return (
    <div className="relative min-h-screen">
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-[#c39bff]/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-40 -right-32 w-[500px] h-[500px] bg-[#a1faff]/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-20">
        <div className="mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c39bff]/10 border border-[#c39bff]/20 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c39bff] animate-pulse" />
            <span className="text-[10px] tracking-widest uppercase font-bold text-[#c39bff]">
              Live Demo — Event Company OS
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter text-white mb-4">
            One file.
            <br />
            <span className="text-gradient-nocturne">Every vendor.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/50 max-w-2xl">
            Artists, AV, photo, decor, license — coordinated in a single event file.
            Call sheets to the crew in one tap. BOQ and rider consolidated automatically.
          </p>
        </div>

        {files.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 border border-white/5 text-center">
            <div className="text-white/40">Demo files loading…</div>
            <div className="text-white/30 text-xs mt-2">
              If this persists, the API may be cold-starting. Give it 30s.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {files.map((f, idx) => {
              const glowColor = ['#c39bff', '#a1faff', '#ffbf00'][idx % 3];
              return (
                <Link
                  key={f.id}
                  href={`/demo/event-files/${f.id}`}
                  className="group relative glass-card rounded-2xl p-6 md:p-8 border border-white/5 hover:border-white/20 transition-all overflow-hidden"
                >
                  <div
                    className="absolute -top-20 -right-20 w-64 h-64 blur-[100px] rounded-full pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: `${glowColor}20` }}
                  />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-6">
                      <div
                        className="text-[10px] tracking-widest uppercase font-bold"
                        style={{ color: glowColor }}
                      >
                        {f.status || 'Planning'}
                      </div>
                      <div className="text-xs text-white/30 font-mono">
                        {formatDate(f.event_date)}
                      </div>
                    </div>
                    <h2 className="text-2xl font-display font-extrabold tracking-tight text-white mb-3 group-hover:text-gradient-nocturne transition-all">
                      {cleanName(f.event_name)}
                    </h2>
                    <div className="space-y-1.5 mb-6">
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <span className="text-white/30">●</span>
                        {f.city}
                        {f.venue ? ` · ${f.venue}` : ''}
                      </div>
                      {f.call_time && (
                        <div className="flex items-center gap-2 text-sm text-white/60">
                          <span className="text-white/30">●</span>
                          Call time {f.call_time.slice(0, 5)}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <span className="text-white/30">●</span>
                        Budget {formatINR(f.budget_paise)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                      Open event file
                      <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-16 md:mt-24 glass-card rounded-2xl p-8 md:p-12 border border-white/5 relative overflow-hidden">
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="text-[10px] tracking-widest uppercase font-bold text-[#a1faff] mb-3">
                Pilot program — 10 companies
              </div>
              <h3 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white mb-3">
                Run your next event on GRID.
              </h3>
              <p className="text-white/50">
                Free for 90 days. No card. Founder-led onboarding in 48 hours.
              </p>
            </div>
            <div className="flex md:justify-end">
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
    </div>
  );
}
