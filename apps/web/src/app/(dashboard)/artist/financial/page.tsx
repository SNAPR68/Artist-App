'use client';

import { useEffect, useState } from 'react';
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
        <p className="text-gray-500">Unable to load financial data. Please try again later.</p>
      </div>
    );
  }

  const lightMonths = forecast.filter((p) => p.is_light_month);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Financial Center</h1>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-green-700">Available Balance</p>
          <p className="text-xl font-bold text-green-800">
            {'\u20B9'}{formatINR(dashboard?.available_balance_paise ?? null)}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-700">In Escrow</p>
          <p className="text-xl font-bold text-blue-800">
            {'\u20B9'}{formatINR(dashboard?.in_escrow_paise ?? null)}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-sm text-yellow-700">Pending Settlement</p>
          <p className="text-xl font-bold text-yellow-800">
            {'\u20B9'}{formatINR(dashboard?.pending_settlement_paise ?? null)}
          </p>
        </div>
      </div>

      {/* Cash Flow Forecast */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Cash Flow Forecast</h2>
        {forecast.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <p className="text-gray-500">No forecast data available yet. As you book more gigs, forecasts will appear here.</p>
          </div>
        ) : (
          <>
            {lightMonths.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-yellow-800 font-medium">Heads up: Lighter period ahead</p>
                {lightMonths.map((lm) => (
                  <p key={lm.period} className="text-sm text-yellow-700 mt-1">
                    {lm.advisory || `${lm.label} looks lighter than usual \u2014 a great time to pick up new opportunities.`}
                  </p>
                ))}
              </div>
            )}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3 text-right">Confirmed</th>
                    <th className="px-4 py-3 text-right">Probable</th>
                    <th className="px-4 py-3 text-right">Net Forecast</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {forecast.map((row) => (
                    <tr key={row.period} className={row.is_light_month ? 'bg-yellow-50/50' : ''}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.label}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {'\u20B9'}{formatINR(row.confirmed_paise)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        {'\u20B9'}{formatINR(row.probable_paise)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        {'\u20B9'}{formatINR(row.net_forecast_paise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Tax Summary */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Tax Summary ({fy.label})</h2>
        {!tax ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <p className="text-gray-500">No tax data available for this financial year yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-500">Gross Earnings</p>
                <p className="text-lg font-bold text-gray-900">{'\u20B9'}{formatINR(tax.gross_earnings_paise)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-500">TDS Deducted</p>
                <p className="text-lg font-bold text-red-600">{'\u20B9'}{formatINR(tax.tds_deducted_paise)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-500">GST Paid</p>
                <p className="text-lg font-bold text-gray-600">{'\u20B9'}{formatINR(tax.gst_paid_paise)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-700">Net Income</p>
                <p className="text-lg font-bold text-green-800">{'\u20B9'}{formatINR(tax.net_income_paise)}</p>
              </div>
            </div>

            {/* Quarterly Breakdown */}
            {tax.quarterly_breakdown && tax.quarterly_breakdown.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-4">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">Quarterly Breakdown</h3>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-2">Quarter</th>
                      <th className="px-4 py-2 text-right">Gross</th>
                      <th className="px-4 py-2 text-right">TDS</th>
                      <th className="px-4 py-2 text-right">GST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tax.quarterly_breakdown.map((q) => (
                      <tr key={q.quarter}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{q.quarter}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900">{'\u20B9'}{formatINR(q.gross_paise)}</td>
                        <td className="px-4 py-2 text-sm text-right text-red-600">{'\u20B9'}{formatINR(q.tds_paise)}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-600">{'\u20B9'}{formatINR(q.gst_paise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* Income Certificate Placeholder */}
      <div className="mt-6">
        <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-4 text-center">
          <p className="text-sm text-gray-500">Income certificate requests coming soon</p>
          <p className="text-xs text-gray-400 mt-1">You will be able to generate income certificates for visa/loan applications.</p>
        </div>
      </div>
    </div>
  );
}
