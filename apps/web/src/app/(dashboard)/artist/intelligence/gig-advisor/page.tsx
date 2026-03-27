'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../../../../lib/api-client';

interface ActiveInquiry {
  inquiry_id: string;
  event_type: string;
  city: string;
  event_date: string;
  client_name?: string;
  expected_value_paise: number;
  conversion_probability: number;
  travel_cost_paise: number;
  recommendation: 'ACCEPT' | 'HOLD' | 'DECLINE';
  reasoning: string;
}

interface InquiryComparison {
  inquiries: ActiveInquiry[];
}

interface GigOpportunity {
  id: string;
  city: string;
  event_type: string;
  date_range_start: string;
  date_range_end: string;
  demand_level: 'High' | 'Peak' | 'Moderate';
  opportunity_score: number;
  rationale: string;
}

interface GigAdvisorData {
  opportunities: GigOpportunity[];
}

function formatINR(paise: number): string {
  if (!paise) return '0.00';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function recommendationBadge(rec: string) {
  if (rec === 'ACCEPT') {
    return <span className="text-xs font-black px-3 py-1 rounded-full bg-green-400/20 text-green-400 uppercase tracking-widest">Accept</span>;
  }
  if (rec === 'HOLD') {
    return <span className="text-xs font-black px-3 py-1 rounded-full bg-[#ffbf00]/20 text-[#ffbf00] uppercase tracking-widest">Hold</span>;
  }
  return <span className="text-xs font-black px-3 py-1 rounded-full bg-white/10 text-white/60 uppercase tracking-widest">Consider Later</span>;
}

function demandBadge(level: string) {
  if (level === 'Peak') {
    return <span className="text-xs font-black px-3 py-1 rounded-full bg-[#ff8b9a]/20 text-[#ff8b9a] uppercase tracking-widest">Peak</span>;
  }
  if (level === 'High') {
    return <span className="text-xs font-black px-3 py-1 rounded-full bg-[#ffbf00]/20 text-[#ffbf00] uppercase tracking-widest">High</span>;
  }
  return <span className="text-xs font-black px-3 py-1 rounded-full bg-[#a1faff]/20 text-[#a1faff] uppercase tracking-widest">Moderate</span>;
}

export default function GigAdvisorPage() {
  const [inquiries, setInquiries] = useState<ActiveInquiry[]>([]);
  const [opportunities, setOpportunities] = useState<GigOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient<InquiryComparison>('/v1/artist-intelligence/gig-advisor-v2'),
      apiClient<GigAdvisorData>('/v1/artists/me/intelligence/gig-advisor'),
    ])
      .then(([compRes, advRes]) => {
        if (compRes.success && compRes.data?.inquiries) {
          setInquiries(compRes.data.inquiries);
        }
        if (advRes.success && advRes.data?.opportunities) {
          setOpportunities(advRes.data.opportunities);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

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
        <p className="text-white/40">Unable to load gig advisor data. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Ambient Glows ─── */}
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="glass-card rounded-xl p-8 border border-white/5 relative overflow-hidden animate-fade-in-up relative z-10">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#c39bff]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Smart Matching</span>
          <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tighter text-white">Gig Advisor</h1>
          <p className="text-white/40 text-sm mt-1">AI-powered recommendations for maximizing your earnings</p>
        </div>
      </div>

      {/* Active Inquiries */}
      <section className="relative z-10">
        <h2 className="text-lg font-bold uppercase tracking-widest text-white mb-3">Active Inquiries</h2>
        {inquiries.length === 0 ? (
          <div className="glass-card rounded-xl border border-white/5 p-6 text-center">
            <p className="text-white/50">No active inquiries to compare right now.</p>
            <p className="text-sm text-white/40 mt-1">When you receive new booking inquiries, our advisor will help you evaluate them.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inquiries.map((inq) => (
              <div key={inq.inquiry_id} className="glass-card rounded-xl border border-white/5 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-white">
                      {inq.event_type} • {inq.city}
                    </p>
                    <p className="text-sm text-white/60">
                      {new Date(inq.event_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {inq.client_name && ` • ${inq.client_name}`}
                    </p>
                  </div>
                  {recommendationBadge(inq.recommendation)}
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Expected Value</p>
                    <p className="text-sm font-black text-[#c39bff]">₹{formatINR(inq.expected_value_paise)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Conversion</p>
                    <p className="text-sm font-black text-[#a1faff]">{inq.conversion_probability}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Travel Cost</p>
                    <p className="text-sm font-black text-white">₹{formatINR(inq.travel_cost_paise)}</p>
                  </div>
                </div>
                <p className="text-xs text-white/60 italic">{inq.reasoning}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Opportunities */}
      <section className="relative z-10">
        <h2 className="text-lg font-bold uppercase tracking-widest text-white mb-3">Market Opportunities</h2>
        {opportunities.length === 0 ? (
          <div className="glass-card rounded-xl border border-white/5 p-6 text-center">
            <p className="text-white/50">No new opportunities detected this period.</p>
            <p className="text-sm text-white/40 mt-1">Check back soon for recommendations in your cities and genres.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <div key={opp.id} className="glass-card rounded-xl border border-white/5 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-white">{opp.event_type} • {opp.city}</p>
                    <p className="text-sm text-white/60">
                      {new Date(opp.date_range_start).toLocaleDateString('en-IN')} to {new Date(opp.date_range_end).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  {demandBadge(opp.demand_level)}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#c39bff] to-[#a1faff]" style={{ width: `${opp.opportunity_score}%` }} />
                  </div>
                  <span className="text-xs font-black text-[#c39bff]">{opp.opportunity_score}%</span>
                </div>
                <p className="text-xs text-white/60">{opp.rationale}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
