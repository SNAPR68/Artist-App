'use client';

import { X, Sparkles, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { useMemo } from 'react';

interface DealRow {
  booking_id: string;
  event_date: string;
  event_name: string;
  stage_name: string | null;
  state: string;
  quoted_amount_paise: number | null;
  final_amount_paise: number | null;
}

interface Summary {
  total_deals: number;
  completed_deals: number;
  gross_volume_paise: number;
  unique_artists: number;
  unique_clients: number;
}

interface Props {
  summary: Summary | null;
  deals: DealRow[];
  onClose: () => void;
}

/**
 * Agency Assistant — Sprint 1 stub.
 * Derives lightweight pipeline insights from the deals already loaded on the page.
 * No network, no model call — just deterministic signal. Real LLM integration lands in Sprint 2.
 */
export function AgencyAssistantPanel({ summary, deals, onClose }: Props) {
  const insights = useMemo(() => {
    const items: { icon: typeof Sparkles; tone: 'info' | 'warn' | 'ok'; title: string; body: string }[] = [];

    const stuckInNegotiation = deals.filter((d) => d.state === 'negotiating').length;
    if (stuckInNegotiation >= 3) {
      items.push({
        icon: AlertCircle,
        tone: 'warn',
        title: `${stuckInNegotiation} deals in negotiation`,
        body: 'Pipeline is stalling at the negotiation stage. Consider a nudge or revised quote.',
      });
    }

    const now = Date.now();
    const soon = deals.filter((d) => {
      const t = new Date(d.event_date).getTime();
      return t > now && t < now + 14 * 24 * 3600 * 1000 && d.state !== 'confirmed' && d.state !== 'completed';
    });
    if (soon.length > 0) {
      items.push({
        icon: Clock,
        tone: 'warn',
        title: `${soon.length} unconfirmed deals in next 14 days`,
        body: 'Close these fast — event date is near and nothing is confirmed yet.',
      });
    }

    const quotedValue = deals
      .filter((d) => d.state === 'quoted' || d.state === 'negotiating')
      .reduce((sum, d) => sum + (d.quoted_amount_paise ?? 0), 0);
    if (quotedValue > 0) {
      const rupees = quotedValue / 100;
      const formatted = rupees >= 100000 ? `₹${(rupees / 100000).toFixed(1)}L` : `₹${(rupees / 1000).toFixed(0)}K`;
      items.push({
        icon: TrendingUp,
        tone: 'info',
        title: `${formatted} in open pipeline`,
        body: 'Potential revenue across quoted + negotiating deals.',
      });
    }

    if (summary && summary.total_deals > 0) {
      const winRate = Math.round((summary.completed_deals / summary.total_deals) * 100);
      items.push({
        icon: Sparkles,
        tone: 'ok',
        title: `${winRate}% historical win rate`,
        body: `${summary.completed_deals} of ${summary.total_deals} deals closed over the lifetime of this workspace.`,
      });
    }

    if (items.length === 0) {
      items.push({
        icon: Sparkles,
        tone: 'info',
        title: 'Quiet pipeline',
        body: 'No urgent signals. Drag deals between columns to move them forward.',
      });
    }

    return items;
  }, [deals, summary]);

  return (
    <aside className="glass-card rounded-xl border border-white/10 p-4 h-fit sticky top-20 self-start">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#c39bff]" />
          <span className="text-xs uppercase tracking-widest font-bold text-white">Assistant</span>
        </div>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white p-1 rounded-md hover:bg-white/10"
          aria-label="Close assistant"
        >
          <X size={14} />
        </button>
      </div>

      <p className="text-[11px] text-white/40 mb-4">
        Auto-generated signals from your current pipeline. LLM-powered replies coming in Sprint 2.
      </p>

      <div className="space-y-3">
        {insights.map((i, idx) => {
          const Icon = i.icon;
          const toneClass =
            i.tone === 'warn'
              ? 'border-[#ffbf00]/30 bg-[#ffbf00]/5'
              : i.tone === 'ok'
                ? 'border-green-500/30 bg-green-500/5'
                : 'border-[#a1faff]/30 bg-[#a1faff]/5';
          const iconColor =
            i.tone === 'warn' ? 'text-[#ffbf00]' : i.tone === 'ok' ? 'text-green-300' : 'text-[#a1faff]';
          return (
            <div key={idx} className={`rounded-lg border p-3 ${toneClass}`}>
              <div className="flex items-start gap-2">
                <Icon size={14} className={`${iconColor} shrink-0 mt-0.5`} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">{i.title}</p>
                  <p className="text-[11px] text-white/60 mt-1 leading-relaxed">{i.body}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
