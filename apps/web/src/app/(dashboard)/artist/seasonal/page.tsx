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
  PEAK: 'bg-red-100 text-red-600',
  HIGH: 'bg-orange-100 text-orange-600',
  MODERATE: 'bg-yellow-100 text-yellow-600',
  LOW: 'bg-gray-100 text-gray-500',
};

const DEMAND_DOT: Record<string, string> = {
  PEAK: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MODERATE: 'bg-yellow-500',
  LOW: 'bg-gray-400',
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
      <h1 className="text-2xl font-bold text-gray-900">Seasonal Insights</h1>

      {/* Demand by Month */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Demand by Month</h2>
        {curves.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-500 text-sm">Not enough booking data to show seasonal trends yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {curves.map((c) => (
              <div key={c.month} className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="font-medium text-gray-900 text-sm">{c.month_name}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${DEMAND_DOT[c.demand_level]}`} />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DEMAND_COLORS[c.demand_level]}`}>
                    {c.demand_level}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Fill rate</span>
                    <span>{Math.round(c.fill_rate)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-primary-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(c.fill_rate, 100)}%` }}
                    />
                  </div>
                </div>
                {c.yoy_change_pct != null && (
                  <p className={`mt-2 text-xs font-medium ${c.yoy_change_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Alerts &amp; Opportunities</h2>
        {alerts.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-500 text-sm">No seasonal alerts right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{ALERT_ICONS[alert.type] ?? '📢'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{alert.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {alert.city} &middot; {alert.month}
                  </p>
                </div>
                <button
                  onClick={() => handleMarkRead(alert.id)}
                  disabled={markingRead === alert.id}
                  className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2.5 py-1 flex-shrink-0 disabled:opacity-50"
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
