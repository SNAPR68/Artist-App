'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  href: string;
  cta: string;
}

const CHECKLIST: ChecklistItem[] = [
  {
    key: 'workspace',
    label: 'Create your workspace',
    description: 'Set up your agency profile and invite your team.',
    href: '/client/workspace',
    cta: 'Go to Workspace',
  },
  {
    key: 'brief',
    label: 'Submit your first brief',
    description: 'Describe an event and get AI-powered artist recommendations.',
    href: '/',
    cta: 'Submit Brief',
  },
  {
    key: 'proposal',
    label: 'Generate a proposal',
    description: 'Create a branded, client-ready proposal PDF.',
    href: '/client/workspace',
    cta: 'Create Proposal',
  },
  {
    key: 'team',
    label: 'Invite a team member',
    description: 'Add your team so everyone sees the deal pipeline.',
    href: '/client/workspace',
    cta: 'Invite Team',
  },
];

export function OnboardingChecklist() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check what the user has already done
    const checkProgress = async () => {
      const done = new Set<string>();

      try {
        // Check if workspace exists
        const wsRes = await apiClient<any>('/v1/workspaces');
        if (wsRes.success && Array.isArray(wsRes.data) && wsRes.data.length > 0) {
          done.add('workspace');

          // Check team members
          const ws = wsRes.data[0];
          if (ws.member_count > 1) done.add('team');
        }

        // Check if any briefs exist
        const briefRes = await apiClient<any>('/v1/vault/history?source=briefs&per_page=1');
        if (briefRes.success && briefRes.data?.total > 0) done.add('brief');

        // Check if any presentations exist
        const bookRes = await apiClient<any>('/v1/vault/history?source=bookings&per_page=1');
        if (bookRes.success && briefRes.data?.total > 0 && bookRes.data?.total > 0) done.add('proposal');
      } catch {
        // Non-fatal
      }

      setCompleted(done);
      setLoading(false);

      // Auto-dismiss if all done
      if (done.size >= CHECKLIST.length) {
        setDismissed(true);
      }

      // Check localStorage for manual dismiss
      if (typeof window !== 'undefined' && localStorage.getItem('grid_onboarding_dismissed')) {
        setDismissed(true);
      }
    };

    checkProgress();
  }, []);

  if (dismissed || loading) return null;

  const progress = completed.size / CHECKLIST.length;

  return (
    <div className="rounded-2xl border border-white/10 p-6 mb-6" style={{ background: 'rgba(195, 155, 255, 0.03)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white mb-0.5">Get started with GRID</h3>
          <p className="text-xs text-white/30">{completed.size} of {CHECKLIST.length} complete</p>
        </div>
        <button
          onClick={() => {
            setDismissed(true);
            localStorage.setItem('grid_onboarding_dismissed', 'true');
          }}
          className="text-white/20 hover:text-white/40 text-xs"
          aria-label="Dismiss onboarding checklist"
        >
          Dismiss
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-white/5 rounded-full mb-5">
        <div
          className="h-1 bg-[#c39bff] rounded-full transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-3">
        {CHECKLIST.map((item) => {
          const isDone = completed.has(item.key);
          return (
            <div
              key={item.key}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                isDone ? 'opacity-50' : 'border border-white/5 hover:border-white/10'
              }`}
            >
              {/* Check circle */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                isDone ? 'bg-[#22c55e]/20' : 'border border-white/15'
              }`}>
                {isDone && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isDone ? 'text-white/40 line-through' : 'text-white'}`}>
                  {item.label}
                </p>
                <p className="text-[10px] text-white/25">{item.description}</p>
              </div>

              {/* CTA */}
              {!isDone && (
                <Link
                  href={item.href}
                  className="text-[10px] text-[#c39bff] hover:text-white font-medium px-3 py-1 rounded-lg border border-[#c39bff]/20 hover:border-[#c39bff]/40 transition-colors flex-shrink-0"
                >
                  {item.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
