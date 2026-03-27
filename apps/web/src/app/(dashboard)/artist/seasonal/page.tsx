'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../../../lib/api-client';

interface DemandCurve {
  month: number;
  month_name: string;
  demand_level: 'PEAK' | 'HIGH' | 'MODERATE' | 'LOW';
  fill_rate: number;
  yoy_change_pct: number | null;
}

interface SeasonalAlert {
  id: string;
  type: 'peak_approaching' | 'valley_approaching' | 'booking_window_closing' | 'price_opportunity';
  title: string;
  message: string;
  city: string;
  month: string;
  is_read: boolean;
}

const DEMAND_COLORS: Record<string, string> = {
  PEAK: 'bg-[#ff8b9a]/20 text-[#ff8b9a]',
  HIGH: 'bg-[#ffbf00]/20 text-[#ffbf00]',
  MODERATE: 'bg-[#ffbf00]/15 text-[#ffbf00]',
  LOW: 'bg-white/10 text-white/60',
};

const DEMAND_DOT: Record<string, string> = {
  PEAK: 'bg-[#ff8b9a]',
  HIGH: 'bg-[#ffbf00]',
  MODERATE: 'bg-[#ffbf00]',
  LOW: 'bg-white/40',
};

export default function SeasonalInsightsPage() {
  const [curves, setCurves] = useState<DemandCurve[]>([]);
  const [alerts, setAlerts] = useState<SeasonalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient<DemandCurve[]>('/v1/seasonal/curves'),
      apiClient<SeasonalAlert[]>('/v1/seasonal/alerts'),
    ])
      .then(([curvesRes, alertsRes]) => {
        if (curvesRes.success) setCurves(curvesRes.data);
        if (alertsRes.success) setAlerts(alertsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleMarkRead(alertId: string) {
    setMarkingRead(alertId);
    try {
      const res = await apiClient(`/v1/seasonal/alerts/${alertId}/read`, { method: 'POST' });
      if (res.success) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingRead(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* ─── Ambient Glows ─── */}
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden animate-fade-in-up relative z-10">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Demand Patterns</span>
          <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white">Seasonal Demand</h1>
          <p className="text-white/40 text-sm mt-1">Understand monthly booking trends and opportunities</p>
        </div>
      </div>

      {/* Demand by Month */}
      <section className="relative z-10">
        <h2 className="text-lg font-bold uppercase tracking-widest text-white mb-4">Demand by Month</h2>
        {curves.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <p className="text-white/50 text-sm">Not enough booking data to show seasonal trends yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {curves.map((c) => (
              <div key={c.month} className="glass-card rounded-xl border border-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-white">{c.month_name}</span>
                      <span className={`text-xs font-black px-2 py-1 rounded-full uppercase tracking-widest ${DEMAND_COLORS[c.demand_level]}`}>
                        {c.demand_level}
                      </span>
                    </div>
                    <p className="text-xs text-white/50">Fill Rate: {(c.fill_rate * 100).toFixed(0)}%</p>
                  </div>
                  {c.yoy_change_pct && (
                    <span className={`text-xs font-black ${c.yoy_change_pct >= 0 ? 'text-green-400' : 'text-[#ff8b9a]'}`}>
                      {c.yoy_change_pct >= 0 ? '+' : ''}{c.yoy_change_pct}% YoY
                    </span>
                  )}
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${DEMAND_DOT[c.demand_level]}`} style={{ width: `${c.fill_rate * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Alerts */}
      <section className="relative z-10">
        <h2 className="text-lg font-bold uppercase tracking-widest text-white mb-4">Seasonal Alerts</h2>
        {alerts.length === 0 ? (
          <div className="glass-card rounded-xl border border-white/5 p-6 text-center">
            <p className="text-white/50">No active alerts. Your calendar is clear!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className={`glass-card rounded-xl border border-white/5 p-4 ${markingRead === alert.id ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{alert.type === 'peak_approaching' ? '🔥' : alert.type === 'valley_approaching' ? '❄️' : alert.type === 'booking_window_closing' ? '⏰' : '💰'}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{alert.title}</h3>
                    <p className="text-sm text-white/60 mt-1">{alert.message}</p>
                    <p className="text-xs text-white/40 mt-2">{alert.city} • {alert.month}</p>
                  </div>
                  <button
                    onClick={() => handleMarkRead(alert.id)}
                    disabled={markingRead === alert.id}
                    className="text-xs font-bold text-[#a1faff] hover:text-white transition-colors disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
