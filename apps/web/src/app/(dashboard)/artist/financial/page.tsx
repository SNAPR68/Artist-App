'use client';

import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, IndianRupee, FileText, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

interface FinancialDashboard {
  available_balance_paise: number;
  in_escrow_paise: number;
  pending_settlement_paise: number;
}

interface ForecastPeriod {
  period: string;
  label: string;
  confirmed_paise: number;
  probable_paise: number;
  net_forecast_paise: number;
  is_light_month: boolean;
  advisory?: string;
}

interface ForecastData {
  periods: ForecastPeriod[];
}

interface TaxQuarter {
  quarter: string;
  gross_paise: number;
  tds_paise: number;
  gst_paise: number;
}

interface TaxSummary {
  period_label: string;
  gross_earnings_paise: number;
  tds_deducted_paise: number;
  gst_paid_paise: number;
  net_income_paise: number;
  quarterly_breakdown?: TaxQuarter[];
}

function formatINR(paise: number | null): string {
  if (!paise) return '0';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function getCurrentFY(): { start: string; end: string; label: string } {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    start: `${year}-04-01`,
    end: `${year + 1}-03-31`,
    label: `FY ${year}\u2013${(year + 1).toString().slice(2)}`,
  };
}

export default function FinancialCenterPage() {
  const [dashboard, setDashboard] = useState<FinancialDashboard | null>(null);
  const [forecast, setForecast] = useState<ForecastPeriod[]>([]);
  const [tax, setTax] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fy = getCurrentFY();

  useEffect(() => {
    Promise.all([
      apiClient<FinancialDashboard>('/v1/financial/dashboard'),
      apiClient<ForecastData>('/v1/financial/forecast'),
      apiClient<TaxSummary>(`/v1/financial/tax-summary?period_start=${fy.start}&period_end=${fy.end}`),
    ])
      .then(([dashRes, forecastRes, taxRes]) => {
        if (dashRes.success) setDashboard(dashRes.data);
        if (forecastRes.success && forecastRes.data?.periods) setForecast(forecastRes.data.periods);
        if (taxRes.success) setTax(taxRes.data);
        if (!dashRes.success && !forecastRes.success && !taxRes.success) setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [fy.start, fy.end]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-white/40">Unable to load financial data. Please try again later.</p>
      </div>
    );
  }

  const lightMonths = forecast.filter((p) => p.is_light_month);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-nocturne-text-primary">Financial Center</h1>
          <p className="text-nocturne-text-secondary text-sm mt-1">Track earnings, forecasts, and taxes</p>
        </div>
        <Wallet className="text-nocturne-accent opacity-50" size={32} />
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Available Balance */}
        <div className="glass-card bg-gradient-to-br from-green-500/10 to-transparent p-6 border-green-400/30 group hover-glow">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm font-display font-semibold text-nocturne-text-secondary">Available Balance</p>
            <TrendingUp size={18} className="text-green-400 opacity-60" />
          </div>
          <p className="text-3xl font-display font-bold text-gradient-nocturne">
            {'\u20B9'}{formatINR(dashboard?.available_balance_paise ?? null)}
          </p>
          <p className="text-xs text-green-300/70 mt-2">Ready to withdraw</p>
        </div>

        {/* In Escrow */}
        <div className="glass-card bg-gradient-to-br from-primary-500/10 to-transparent p-6 border-primary-400/30 group hover-glow">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm font-display font-semibold text-nocturne-text-secondary">In Escrow</p>
            <FileText size={18} className="text-nocturne-accent opacity-60" />
          </div>
          <p className="text-3xl font-display font-bold text-nocturne-accent">
            {'\u20B9'}{formatINR(dashboard?.in_escrow_paise ?? null)}
          </p>
          <p className="text-xs text-nocturne-accent/70 mt-2">Held in reserve</p>
        </div>

        {/* Pending Settlement */}
        <div className="glass-card bg-gradient-to-br from-yellow-500/10 to-transparent p-6 border-yellow-400/30 group hover-glow">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm font-display font-semibold text-nocturne-text-secondary">Pending Settlement</p>
            <TrendingDown size={18} className="text-yellow-400 opacity-60" />
          </div>
          <p className="text-3xl font-display font-bold text-yellow-300">
            {'\u20B9'}{formatINR(dashboard?.pending_settlement_paise ?? null)}
          </p>
          <p className="text-xs text-yellow-300/70 mt-2">Processing soon</p>
        </div>
      </div>

      {/* Cash Flow Forecast */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-display font-semibold text-nocturne-text-primary">Cash Flow Forecast</h2>
          <TrendingUp size={20} className="text-nocturne-accent opacity-60" />
        </div>
        {forecast.length === 0 ? (
          <div className="glass-card p-8 text-center space-y-3">
            <p className="text-nocturne-text-secondary">No forecast data available yet</p>
            <p className="text-nocturne-text-secondary text-sm">As you book more gigs, forecasts will appear here</p>
          </div>
        ) : (
          <>
            {lightMonths.length > 0 && (
              <div className="glass-card bg-gradient-to-br from-yellow-500/10 to-transparent p-4 border border-yellow-400/30 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-display font-semibold text-yellow-300">Heads up: Lighter period ahead</p>
                    {lightMonths.map((lm) => (
                      <p key={lm.period} className="text-sm text-nocturne-text-secondary mt-1">
                        {lm.advisory || `${lm.label} looks lighter than usual — a great time to pick up new opportunities.`}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-nocturne-border">
                      <th className="px-4 py-4 text-left text-xs font-display font-semibold text-nocturne-text-secondary uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-display font-semibold text-nocturne-text-secondary uppercase tracking-wider">
                        Confirmed
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-display font-semibold text-nocturne-text-secondary uppercase tracking-wider">
                        Probable
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-display font-semibold text-nocturne-text-secondary uppercase tracking-wider">
                        Net Forecast
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nocturne-border">
                    {forecast.map((row) => (
                      <tr
                        key={row.period}
                        className={`${row.is_light_month ? 'bg-yellow-500/5' : 'hover:bg-nocturne-surface-2/50'} transition-colors duration-200`}
                      >
                        <td className="px-4 py-3 text-sm font-display font-semibold text-nocturne-text-primary">{row.label}</td>
                        <td className="px-4 py-3 text-sm text-right text-green-300 font-medium">
                          {'\u20B9'}{formatINR(row.confirmed_paise)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-nocturne-text-secondary">
                          {'\u20B9'}{formatINR(row.probable_paise)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-display font-bold text-gradient-nocturne">
                          {'\u20B9'}{formatINR(row.net_forecast_paise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Tax Summary */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-display font-semibold text-nocturne-text-primary">Tax Summary ({fy.label})</h2>
          <IndianRupee size={20} className="text-nocturne-accent opacity-60" />
        </div>
        {!tax ? (
          <div className="glass-card p-8 text-center space-y-3">
            <p className="text-nocturne-text-secondary">No tax data available for this financial year yet</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Gross Earnings */}
              <div className="glass-card bg-gradient-to-br from-primary-500/10 to-transparent p-5 border-primary-400/30 hover-glow">
                <p className="text-xs font-display font-semibold text-nocturne-text-secondary mb-2 uppercase tracking-wider">Gross Earnings</p>
                <p className="text-2xl font-display font-bold text-nocturne-accent">{'\u20B9'}{formatINR(tax.gross_earnings_paise)}</p>
              </div>

              {/* TDS Deducted */}
              <div className="glass-card bg-gradient-to-br from-red-500/10 to-transparent p-5 border-red-400/30 hover-glow">
                <p className="text-xs font-display font-semibold text-nocturne-text-secondary mb-2 uppercase tracking-wider">TDS Deducted</p>
                <p className="text-2xl font-display font-bold text-red-300">-{'\u20B9'}{formatINR(tax.tds_deducted_paise)}</p>
              </div>

              {/* GST Paid */}
              <div className="glass-card bg-gradient-to-br from-yellow-500/10 to-transparent p-5 border-yellow-400/30 hover-glow">
                <p className="text-xs font-display font-semibold text-nocturne-text-secondary mb-2 uppercase tracking-wider">GST Paid</p>
                <p className="text-2xl font-display font-bold text-yellow-300">-{'\u20B9'}{formatINR(tax.gst_paid_paise)}</p>
              </div>

              {/* Net Income */}
              <div className="glass-card bg-gradient-to-br from-green-500/10 to-transparent p-5 border-green-400/30 hover-glow">
                <p className="text-xs font-display font-semibold text-nocturne-text-secondary mb-2 uppercase tracking-wider">Net Income</p>
                <p className="text-2xl font-display font-bold text-green-300">{'\u20B9'}{formatINR(tax.net_income_paise)}</p>
              </div>
            </div>

            {/* Quarterly Breakdown */}
            {tax.quarterly_breakdown && tax.quarterly_breakdown.length > 0 && (
              <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b border-nocturne-border">
                  <h3 className="text-sm font-display font-semibold text-nocturne-text-primary">Quarterly Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-nocturne-border">
                        <th className="px-6 py-3 text-left text-xs font-display font-semibold text-nocturne-text-secondary uppercase tracking-wider">
                          Quarter
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-display font-semibold text-nocturne-text-secondary uppercase tracking-wider">
                          Gross
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-display font-semibold text-nocturne-text-secondary uppercase tracking-wider">
                          TDS
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-display font-semibold text-nocturne-text-secondary uppercase tracking-wider">
                          GST
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-nocturne-border">
                      {tax.quarterly_breakdown.map((q) => (
                        <tr key={q.quarter} className="hover:bg-nocturne-surface-2/50 transition-colors duration-200">
                          <td className="px-6 py-3 text-sm font-display font-semibold text-nocturne-text-primary">{q.quarter}</td>
                          <td className="px-6 py-3 text-sm text-right text-nocturne-accent font-medium">
                            {'\u20B9'}{formatINR(q.gross_paise)}
                          </td>
                          <td className="px-6 py-3 text-sm text-right text-red-300 font-medium">
                            {'\u20B9'}{formatINR(q.tds_paise)}
                          </td>
                          <td className="px-6 py-3 text-sm text-right text-yellow-300 font-medium">
                            {'\u20B9'}{formatINR(q.gst_paise)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Income Certificate Placeholder */}
      <div className="glass-card bg-gradient-to-br from-primary-500/5 to-transparent border-dashed border-primary-400/20 p-6 text-center space-y-2">
        <FileText className="mx-auto text-nocturne-accent/60" size={28} />
        <p className="text-sm font-display font-semibold text-nocturne-text-secondary">Income Certificate Requests</p>
        <p className="text-xs text-nocturne-text-secondary">Coming soon — Generate income certificates for visa and loan applications</p>
      </div>
    </div>
  );
}
