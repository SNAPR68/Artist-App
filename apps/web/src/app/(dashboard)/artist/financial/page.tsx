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
    label: `FY ${year}–${(year + 1).toString().slice(2)}`,
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
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
      {/* ─── Ambient Glows ─── */}
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      {/* ─── Bento Hero: 7+5 Escrow Wallet ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
        {/* Main Balance Card */}
        <div className="md:col-span-7 glass-card rounded-xl p-10 border border-white/5 relative overflow-hidden group">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute top-8 right-8">
            <Wallet className="w-10 h-10 text-[#c39bff] opacity-20 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
          <div className="relative z-10">
            <p className="text-white/50 text-sm font-bold uppercase tracking-widest mb-1">Total Escrow Value</p>
            <h3 className="text-5xl md:text-7xl font-black text-white tracking-tighter">
              ₹{formatINR(dashboard?.in_escrow_paise ?? null)}<span className="text-[#c39bff] text-2xl">.00</span>
            </h3>
          </div>
          <div className="mt-10 flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] text-[#a1faff] tracking-widest uppercase mb-1 font-black">Available</span>
              <span className="text-2xl font-black text-white">₹{formatINR(dashboard?.available_balance_paise ?? null)}</span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[10px] text-[#ffbf00] tracking-widest uppercase mb-1 font-black">Pending</span>
              <span className="text-2xl font-black text-white">₹{formatINR(dashboard?.pending_settlement_paise ?? null)}</span>
            </div>
          </div>
        </div>
        {/* Animated Bar Chart */}
        <div className="md:col-span-5 glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#c39bff]/5 to-transparent pointer-events-none" />
          <p className="text-white/50 text-xs uppercase tracking-widest mb-6 font-black relative z-10">Earnings Trend</p>
          <div className="h-48 w-full flex items-end justify-between gap-2 relative z-10">
            {[40, 70, 55, 85, 45, 65, 90].map((h, i) => (
              <div
                key={i}
                className={`w-full rounded-t-lg transition-all duration-700 ${i % 2 === 0 ? 'bg-white/5' : i === 3 || i === 6 ? 'bg-[#a1faff]/20' : 'bg-[#c39bff]/20'}`}
                style={{ height: `${h}%`, transitionDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
          <div className="mt-4 flex justify-between text-[10px] text-white/30 font-black uppercase tracking-widest relative z-10">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span>
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
        {/* Available Balance */}
        <div className="glass-card bg-gradient-to-br from-green-500/10 to-transparent p-6 border border-green-400/20 rounded-xl">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-black uppercase tracking-widest text-white/60">Available Balance</p>
            <TrendingUp size={18} className="text-green-400 opacity-60" />
          </div>
          <p className="text-3xl font-black text-green-400">₹{formatINR(dashboard?.available_balance_paise ?? null)}</p>
          <p className="text-xs text-green-300/70 mt-2">Ready to withdraw</p>
        </div>

        {/* In Escrow */}
        <div className="glass-card bg-gradient-to-br from-[#c39bff]/10 to-transparent p-6 border border-[#c39bff]/20 rounded-xl">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-black uppercase tracking-widest text-white/60">In Escrow</p>
            <FileText size={18} className="text-[#c39bff] opacity-60" />
          </div>
          <p className="text-3xl font-black text-[#c39bff]">₹{formatINR(dashboard?.in_escrow_paise ?? null)}</p>
          <p className="text-xs text-[#c39bff]/70 mt-2">Held in reserve</p>
        </div>

        {/* Pending Settlement */}
        <div className="glass-card bg-gradient-to-br from-[#ffbf00]/10 to-transparent p-6 border border-[#ffbf00]/20 rounded-xl">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-black uppercase tracking-widest text-white/60">Pending Settlement</p>
            <TrendingDown size={18} className="text-[#ffbf00] opacity-60" />
          </div>
          <p className="text-3xl font-black text-[#ffbf00]">₹{formatINR(dashboard?.pending_settlement_paise ?? null)}</p>
          <p className="text-xs text-[#ffbf00]/70 mt-2">Processing soon</p>
        </div>
      </div>

      {/* Cash Flow Forecast */}
      <section className="space-y-4 relative z-10">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold uppercase tracking-widest text-white">Cash Flow Forecast</h2>
          <TrendingUp size={20} className="text-[#c39bff] opacity-60" />
        </div>
        {forecast.length === 0 ? (
          <div className="glass-card p-8 text-center space-y-3 rounded-xl border border-white/5">
            <p className="text-white/50">No forecast data available yet</p>
            <p className="text-white/40 text-sm">As you book more gigs, forecasts will appear here</p>
          </div>
        ) : (
          <>
            {lightMonths.length > 0 && (
              <div className="glass-card bg-gradient-to-br from-[#ffbf00]/10 to-transparent p-4 border border-[#ffbf00]/20 space-y-2 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={18} className="text-[#ffbf00] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#ffbf00]">Heads up: Lighter period ahead</p>
                    {lightMonths.map((lm) => (
                      <p key={lm.period} className="text-sm text-white/50 mt-1">
                        {lm.advisory || `${lm.label} looks lighter than usual — a great time to pick up new opportunities.`}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="glass-card overflow-hidden rounded-xl border border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-4 py-4 text-left text-xs font-black text-white/60 uppercase tracking-widest">
                        Period
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-black text-white/60 uppercase tracking-widest">
                        Confirmed
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-black text-white/60 uppercase tracking-widest">
                        Probable
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-black text-white/60 uppercase tracking-widest">
                        Net Forecast
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {forecast.map((row) => (
                      <tr
                        key={row.period}
                        className={`${row.is_light_month ? 'bg-[#ffbf00]/5' : 'hover:bg-white/5'} transition-colors duration-200`}
                      >
                        <td className="px-4 py-3 text-sm font-bold text-white">{row.label}</td>
                        <td className="px-4 py-3 text-sm text-right text-green-300 font-bold">
                          ₹{formatINR(row.confirmed_paise)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-white/60 font-bold">
                          ₹{formatINR(row.probable_paise)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-black text-[#c39bff]">
                          ₹{formatINR(row.net_forecast_paise)}
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
      <section className="space-y-4 relative z-10">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold uppercase tracking-widest text-white">Tax Summary ({fy.label})</h2>
          <IndianRupee size={20} className="text-[#c39bff] opacity-60" />
        </div>
        {!tax ? (
          <div className="glass-card p-8 text-center space-y-3 rounded-xl border border-white/5">
            <p className="text-white/50">No tax data available for this financial year yet</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Gross Earnings */}
              <div className="glass-card bg-gradient-to-br from-[#c39bff]/10 to-transparent p-5 border border-[#c39bff]/20 rounded-xl">
                <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">Gross Earnings</p>
                <p className="text-2xl font-black text-[#c39bff]">₹{formatINR(tax.gross_earnings_paise)}</p>
              </div>

              {/* TDS Deducted */}
              <div className="glass-card bg-gradient-to-br from-[#ff8b9a]/10 to-transparent p-5 border border-[#ff8b9a]/20 rounded-xl">
                <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">TDS Deducted</p>
                <p className="text-2xl font-black text-[#ff8b9a]">-₹{formatINR(tax.tds_deducted_paise)}</p>
              </div>

              {/* GST Paid */}
              <div className="glass-card bg-gradient-to-br from-[#ffbf00]/10 to-transparent p-5 border border-[#ffbf00]/20 rounded-xl">
                <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">GST Paid</p>
                <p className="text-2xl font-black text-[#ffbf00]">-₹{formatINR(tax.gst_paid_paise)}</p>
              </div>

              {/* Net Income */}
              <div className="glass-card bg-gradient-to-br from-green-500/10 to-transparent p-5 border border-green-400/20 rounded-xl">
                <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">Net Income</p>
                <p className="text-2xl font-black text-green-300">₹{formatINR(tax.net_income_paise)}</p>
              </div>
            </div>

            {/* Quarterly Breakdown */}
            {tax.quarterly_breakdown && tax.quarterly_breakdown.length > 0 && (
              <div className="glass-card overflow-hidden rounded-xl border border-white/5">
                <div className="px-6 py-4 border-b border-white/10 bg-white/5">
                  <h3 className="text-sm font-bold text-white">Quarterly Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-6 py-3 text-left text-xs font-black text-white/60 uppercase tracking-widest">
                          Quarter
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-black text-white/60 uppercase tracking-widest">
                          Gross
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-black text-white/60 uppercase tracking-widest">
                          TDS
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-black text-white/60 uppercase tracking-widest">
                          GST
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {tax.quarterly_breakdown.map((q) => (
                        <tr key={q.quarter} className="hover:bg-white/5 transition-colors duration-200">
                          <td className="px-6 py-3 text-sm font-bold text-white">{q.quarter}</td>
                          <td className="px-6 py-3 text-sm text-right text-[#c39bff] font-bold">
                            ₹{formatINR(q.gross_paise)}
                          </td>
                          <td className="px-6 py-3 text-sm text-right text-[#ff8b9a] font-bold">
                            ₹{formatINR(q.tds_paise)}
                          </td>
                          <td className="px-6 py-3 text-sm text-right text-[#ffbf00] font-bold">
                            ₹{formatINR(q.gst_paise)}
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
      <div className="glass-card bg-gradient-to-br from-[#c39bff]/5 to-transparent border border-dashed border-[#c39bff]/20 p-6 text-center space-y-2 rounded-xl relative z-10">
        <FileText className="mx-auto text-[#c39bff]/60" size={28} />
        <p className="text-sm font-bold text-white">Income Certificate Requests</p>
        <p className="text-xs text-white/50">Coming soon — Generate income certificates for visa and loan applications</p>
      </div>
    </div>
  );
}
