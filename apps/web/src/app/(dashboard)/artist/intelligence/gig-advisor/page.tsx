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
  // CRITICAL: Never say "decline" — use "Consider Later"
  if (rec === 'ACCEPT') {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Accept</span>;
  }
  if (rec === 'HOLD') {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Hold</span>;
  }
  // DECLINE → "Consider Later"
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Consider Later</span>;
}

function demandBadge(level: string) {
  if (level === 'Peak') {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Peak</span>;
  }
  if (level === 'High') {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">High</span>;
  }
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Moderate</span>;
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Unable to load gig advisor data. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Gig Advisor</h1>

      {/* Active Inquiries */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Active Inquiries</h2>
        {inquiries.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <p className="text-gray-500">No active inquiries to compare right now.</p>
            <p className="text-sm text-gray-400 mt-1">When you receive new booking inquiries, our advisor will help you evaluate them.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inquiries.map((inq) => (
              <div key={inq.inquiry_id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      {inq.event_type} &middot; {inq.city}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(inq.event_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {inq.client_name && ` \u00B7 ${inq.client_name}`}
                    </p>
                  </div>
                  {recommendationBadge(inq.recommendation)}
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div>
                    <p className="text-xs text-gray-400">Expected Value</p>
                    <p className="text-sm font-semibold text-gray-900">\u20B9{formatINR(inq.expected_value_paise)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Conversion</p>
                    <p className="text-sm font-semibold text-gray-900">{inq.conversion_probability}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Travel Cost</p>
                    <p className="text-sm font-semibold text-gray-900">\u20B9{formatINR(inq.travel_cost_paise)}</p>
                  </div>
                </div>
                {inq.reasoning && (
                  <p className="text-sm text-gray-600 mt-3 bg-gray-50 rounded p-2">{inq.reasoning}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Opportunities Near You */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Opportunities Near You</h2>
        {opportunities.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <p className="text-gray-500">No new opportunities detected right now.</p>
            <p className="text-sm text-gray-400 mt-1">We scan demand patterns regularly and will show matches here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {opportunities.map((opp) => (
              <div key={opp.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900">{opp.city}</p>
                  {demandBadge(opp.demand_level)}
                </div>
                <p className="text-sm text-gray-500">{opp.event_type}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(opp.date_range_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {' \u2013 '}
                  {new Date(opp.date_range_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                {/* Opportunity Score Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Opportunity Score</span>
                    <span>{opp.opportunity_score}/100</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(opp.opportunity_score, 100)}%` }}
                    />
                  </div>
                </div>
                {opp.rationale && (
                  <p className="text-sm text-gray-600 mt-3">{opp.rationale}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
