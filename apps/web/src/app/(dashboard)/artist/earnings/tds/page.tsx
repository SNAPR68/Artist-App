'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../../../../lib/api-client';

interface TdsSummary {
  pan: string | null;
  total_gross_paise: number;
  total_tds_paise: number;
  total_payout_paise: number;
  bookings_count: number;
  line_items: TdsLineItem[];
}

interface TdsLineItem {
  event_date: string;
  event_type: string;
  gross_paise: number;
  tds_paise: number;
  payout_paise: number;
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

function formatINR(paise: number): string {
  return '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(paise / 100);
}


function getCurrentFY(): number {
  const now = new Date();
  // FY starts Apr 1
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

function fyLabel(startYear: number): string {
  return `FY ${startYear}-${String(startYear + 1).slice(-2)}`;
}

export default function TdsPage() {
  const currentFY = getCurrentFY();
  const fyOptions = [currentFY, currentFY - 1, currentFY - 2];

  const [pan, setPan] = useState<string | null>(null);
  const [panInput, setPanInput] = useState('');
  const [panError, setPanError] = useState('');
  const [panSaving, setPanSaving] = useState(false);
  const [editingPan, setEditingPan] = useState(false);

  const [selectedFY, setSelectedFY] = useState(currentFY);
  const [summary, setSummary] = useState<TdsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // PAN is loaded from the TDS summary response (already masked)

  // Load TDS summary when FY changes; also refreshes PAN status
  useEffect(() => {
    setSummaryLoading(true);
    apiClient<TdsSummary>(`/v1/artists/me/tds/summary?fy=${selectedFY}`)
      .then((res) => {
        if (res.success) {
          setSummary(res.data);
          if (res.data.pan) setPan(res.data.pan);
        } else {
          setSummary(null);
        }
      })
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [selectedFY]);

  async function savePan() {
    const val = panInput.trim().toUpperCase();
    if (!PAN_REGEX.test(val)) {
      setPanError('Enter a valid PAN (e.g. ABCDE1234F)');
      return;
    }
    setPanError('');
    setPanSaving(true);
    try {
      const res = await apiClient('/v1/artists/me/pan', { method: 'PUT', body: JSON.stringify({ pan: val }) });
      if (res.success) {
        setPan(val);
        setEditingPan(false);
        setPanInput('');
      }
    } catch {
      setPanError('Failed to save. Please try again.');
    } finally {
      setPanSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Ambient glows */}
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tighter text-white">
          TDS Certificates
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Auto-generated Form 16A-style summaries per financial year.
        </p>
      </div>

      {/* PAN card */}
      <div className="glass-card rounded-xl p-6 border border-white/5 relative overflow-hidden max-w-xl">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
        <p className="text-xs tracking-widest uppercase font-bold text-white/30 mb-4">PAN on file</p>

        {pan && !editingPan ? (
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-extrabold tracking-tighter text-white">
              {pan}
            </span>
            <button
              className="text-[#c39bff] text-xs hover:text-white transition-colors"
              onClick={() => { setEditingPan(true); setPanInput(''); }}
            >
              Update
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3">
              <input
                className="input-nocturne flex-1 text-sm uppercase tracking-widest"
                placeholder="ABCDE1234F"
                maxLength={10}
                value={panInput}
                onChange={(e) => { setPanInput(e.target.value.toUpperCase()); setPanError(''); }}
              />
              <button
                className="btn-nocturne-primary px-5 py-2 rounded-lg text-sm"
                onClick={savePan}
                disabled={panSaving}
              >
                {panSaving ? 'Saving…' : 'Save PAN'}
              </button>
              {editingPan && (
                <button
                  className="text-white/30 text-xs hover:text-white transition-colors"
                  onClick={() => { setEditingPan(false); setPanError(''); }}
                >
                  Cancel
                </button>
              )}
            </div>
            {panError && <p className="text-red-400 text-xs">{panError}</p>}
          </div>
        )}
      </div>

      {/* FY picker */}
      <div className="flex items-center gap-3">
        <label className="text-xs tracking-widest uppercase font-bold text-white/30">
          Financial Year
        </label>
        <select
          className="input-nocturne text-sm py-1.5 pr-8 w-auto"
          value={selectedFY}
          onChange={(e) => setSelectedFY(Number(e.target.value))}
        >
          {fyOptions.map((fy) => (
            <option key={fy} value={fy}>
              {fyLabel(fy)}
            </option>
          ))}
        </select>
      </div>

      {/* Summary tiles + table */}
      {summaryLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
        </div>
      ) : summary ? (
        <div className="space-y-6">
          {/* Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Gross', value: formatINR(summary.total_gross_paise), color: 'text-white' },
              { label: 'Total TDS', value: formatINR(summary.total_tds_paise), color: 'text-[#ffbf00]' },
              { label: 'Total Payout', value: formatINR(summary.total_payout_paise), color: 'text-[#a1faff]' },
              { label: 'Bookings', value: String(summary.bookings_count), color: 'text-[#c39bff]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="glass-card rounded-xl p-5 border border-white/5 text-center">
                <p className={`font-display text-2xl font-extrabold tracking-tighter ${color}`}>{value}</p>
                <p className="text-white/30 text-xs tracking-widest uppercase font-bold mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Line items table */}
          {summary.line_items.length > 0 && (
            <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
              <table className="nocturne-table w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-4 text-xs tracking-widest uppercase font-bold text-white/30">Event Date</th>
                    <th className="text-left p-4 text-xs tracking-widest uppercase font-bold text-white/30">Event Type</th>
                    <th className="text-right p-4 text-xs tracking-widest uppercase font-bold text-white/30">Gross</th>
                    <th className="text-right p-4 text-xs tracking-widest uppercase font-bold text-white/30">TDS</th>
                    <th className="text-right p-4 text-xs tracking-widest uppercase font-bold text-white/30">Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.line_items.map((item, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="p-4 text-white/70">{new Date(item.event_date).toLocaleDateString('en-IN')}</td>
                      <td className="p-4 text-white/70">{item.event_type}</td>
                      <td className="p-4 text-right text-white">{formatINR(item.gross_paise)}</td>
                      <td className="p-4 text-right text-[#ffbf00]">{formatINR(item.tds_paise)}</td>
                      <td className="p-4 text-right text-[#a1faff]">{formatINR(item.payout_paise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer + download */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-white/30 text-xs">Section 194J · 10% TDS · Issued by GRID</p>
            <button
              className="btn-nocturne-secondary px-5 py-2 rounded-lg text-sm"
              onClick={async () => {
                const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
                const token = localStorage.getItem('access_token');
                const res = await fetch(`${base}/v1/artists/me/tds/certificate.pdf?fy=${selectedFY}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tds-certificate-FY${selectedFY}-${selectedFY + 1}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download PDF
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-8 border border-white/5 max-w-xl">
          <p className="text-white/30 text-sm">No TDS data for {fyLabel(selectedFY)}.</p>
        </div>
      )}
    </div>
  );
}
