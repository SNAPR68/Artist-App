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
  PEAK: 'bg-nocturne-error/15 text-nocturne-error',
  HIGH: 'bg-nocturne-warning/15 text-nocturne-warning',
  MODERATE: 'bg-nocturne-warning/15 text-nocturne-warning',
  LOW: 'bg-nocturne-surface-2 text-nocturne-text-tertiary',
};

const DEMAND_DOT: Record<string, string> = {
  PEAK: 'bg-nocturne-error',
  HIGH: 'bg-nocturne-warning',
  MODERATE: 'bg-nocturne-warning',
  LOW: 'bg-nocturne-text-tertiary',
};

const ALERT_ICONS: Record<string, string> = {
  peak_approaching: '🔥',
  valley_approaching: '❄️',
  booking_window_closing: '⏰',
  price_opportunity: '💰',
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden animate-fade-in-up"><div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" /><div className="relative z-10"><h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white">Seasonal Demand</h1></div></div>

      {/* Demand by Month */}
      <section>
        <h2 className="text-lg font-semibold text-nocturne-text-primary mb-3">Demand by Month</h2>
        {curves.length === 0 ? (
          <div className="bg-nocturne-surface-2 border border-white/5 rounded-lg p-6 text-center">
            <p className="text-nocturne-text-tertiary text-sm">Not enough booking data to show seasonal trends yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {curves.map((c) => (
              <div key={c.month} className="bg-nocturne-surface border border-white/5 rounded-lg p-4">
                <p className="font-medium text-nocturne-text-primary text-sm">{c.month_name}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${DEMAND_DOT[c.demand_level]}`} />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DEMAND_COLORS[c.demand_level]}`}>
                    {c.demand_level}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-nocturne-text-tertiary mb-1">
                    <span>Fill rate</span>
                    <span>{Math.round(c.fill_rate)}%</span>
                  </div>
                  <div className="w-full bg-nocturne-surface-2 rounded-full h-1.5">
                    <div
                      className="bg-nocturne-accent h-1.5 rounded-full"
                      style={{ width: `${Math.min(c.fill_rate, 100)}%` }}
                    />
                  </div>
                </div>
                {c.yoy_change_pct != null && (
                  <p className={`mt-2 text-xs font-medium ${c.yoy_change_pct >= 0 ? 'text-nocturne-success' : 'text-nocturne-error'}`}>
                    {c.yoy_change_pct >= 0 ? '↑' : '↓'} {Math.abs(c.yoy_change_pct).toFixed(1)}% YoY
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Alerts & Opportunities */}
      <section>
        <h2 className="text-lg font-semibold text-nocturne-text-primary mb-3">Alerts &amp; Opportunities</h2>
        {alerts.length === 0 ? (
          <div className="bg-nocturne-surface-2 border border-white/5 rounded-lg p-6 text-center">
            <p className="text-nocturne-text-tertiary text-sm">No seasonal alerts right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="bg-nocturne-surface border border-white/5 rounded-lg p-4 flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{ALERT_ICONS[alert.type] ?? '📢'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-nocturne-text-primary text-sm">{alert.title}</p>
                  <p className="text-sm text-nocturne-text-secondary mt-0.5">{alert.message}</p>
                  <p className="text-xs text-nocturne-text-tertiary mt-1">
                    {alert.city} &middot; {alert.month}
                  </p>
                </div>
                <button
                  onClick={() => handleMarkRead(alert.id)}
                  disabled={markingRead === alert.id}
                  className="text-xs text-nocturne-text-tertiary hover:text-nocturne-text-secondary border border-white/5 rounded px-2.5 py-1 flex-shrink-0 disabled:opacity-50"
                >
                  {markingRead === alert.id ? 'Marking...' : 'Mark Read'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
