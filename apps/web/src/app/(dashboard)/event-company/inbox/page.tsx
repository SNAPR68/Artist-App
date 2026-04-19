'use client';

import { useCallback, useEffect, useState } from 'react';
import { AtSign, Check, CheckCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api-client';

interface Mention {
  id: string;
  workspace_id: string;
  workspace_name: string;
  resource_type: string;
  resource_id: string;
  read_at: string | null;
  created_at: string;
  body: string;
  author_user_id: string;
  author_email: string | null;
}

interface Assignment {
  id: string;
  workspace_id: string;
  workspace_name: string;
  resource_type: string;
  resource_id: string;
  created_at: string;
}

export default function InboxPage() {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tab, setTab] = useState<'mentions' | 'assignments'>('mentions');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [mentionsRes, assignmentsRes] = await Promise.all([
      apiClient<Mention[]>(`/v1/collaboration/mentions${unreadOnly ? '?unread=true' : ''}`),
      apiClient<Assignment[]>('/v1/collaboration/assignments/mine'),
    ]);
    if (mentionsRes.success) setMentions(Array.isArray(mentionsRes.data) ? mentionsRes.data : []);
    if (assignmentsRes.success) setAssignments(Array.isArray(assignmentsRes.data) ? assignmentsRes.data : []);
    setLoading(false);
  }, [unreadOnly]);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    await apiClient('/v1/collaboration/mentions/read', {
      method: 'POST',
      body: JSON.stringify({ all: true }),
    });
    load();
  };

  const markOne = async (id: string) => {
    await apiClient('/v1/collaboration/mentions/read', {
      method: 'POST',
      body: JSON.stringify({ mention_ids: [id] }),
    });
    load();
  };

  const unreadCount = mentions.filter((m) => !m.read_at).length;

  const resourceLink = (type: string, workspaceId: string, resourceId: string) => {
    if (type === 'event') return `/event-company/events/${resourceId}`;
    if (type === 'booking') return `/event-company/bookings/${resourceId}`;
    return `/event-company?workspace=${workspaceId}`;
  };

  return (
    <div className="space-y-6">
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />

      <section className="relative z-10 flex items-center justify-between">
        <div>
          <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Inbox</span>
          <h1 className="text-3xl font-display font-extrabold tracking-tighter text-white">Your activity</h1>
          <p className="text-white/40 text-sm mt-1">Mentions and assignments across your workspaces.</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white hover:bg-white/10 flex items-center gap-2"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </section>

      {/* Tabs */}
      <div className="flex gap-2 relative z-10">
        <TabButton active={tab === 'mentions'} onClick={() => setTab('mentions')} icon={AtSign} label={`Mentions${unreadCount > 0 ? ` · ${unreadCount}` : ''}`} />
        <TabButton active={tab === 'assignments'} onClick={() => setTab('assignments')} icon={Users} label={`Assignments · ${assignments.length}`} />
      </div>

      {tab === 'mentions' && (
        <>
          <div className="flex items-center gap-2 relative z-10">
            <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="rounded accent-[#c39bff]"
              />
              Show unread only
            </label>
          </div>

          <div className="space-y-2 relative z-10">
            {loading ? (
              <p className="text-white/40 text-center py-12">Loading…</p>
            ) : mentions.length === 0 ? (
              <div className="glass-card p-8 rounded-xl border border-white/5 text-center">
                <AtSign className="mx-auto text-white/30 mb-3" size={32} />
                <p className="text-white/50">No mentions. Teammates can @mention you on any deal or event.</p>
              </div>
            ) : (
              mentions.map((m) => (
                <Link
                  key={m.id}
                  href={resourceLink(m.resource_type, m.workspace_id, m.resource_id)}
                  onClick={() => !m.read_at && markOne(m.id)}
                  className={`block glass-card p-4 rounded-xl border transition-all hover:border-[#c39bff]/30 ${
                    m.read_at ? 'border-white/5 opacity-70' : 'border-[#c39bff]/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <AtSign size={12} className="text-[#c39bff]" />
                        <span className="text-xs font-bold text-white">{m.author_email ?? 'A teammate'}</span>
                        <span className="text-[10px] text-white/40">in</span>
                        <span className="text-xs text-[#a1faff]">{m.workspace_name}</span>
                        <span className="text-[10px] text-white/30 ml-auto">
                          {new Date(m.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <p className="text-sm text-white/80 line-clamp-2">{m.body}</p>
                      <p className="text-[10px] text-white/40 mt-2 uppercase tracking-widest">
                        On {m.resource_type}
                      </p>
                    </div>
                    {!m.read_at && (
                      <div className="w-2 h-2 rounded-full bg-[#c39bff] mt-2 shrink-0" title="Unread" />
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </>
      )}

      {tab === 'assignments' && (
        <div className="space-y-2 relative z-10">
          {loading ? (
            <p className="text-white/40 text-center py-12">Loading…</p>
          ) : assignments.length === 0 ? (
            <div className="glass-card p-8 rounded-xl border border-white/5 text-center">
              <Users className="mx-auto text-white/30 mb-3" size={32} />
              <p className="text-white/50">No deals assigned to you yet.</p>
            </div>
          ) : (
            assignments.map((a) => (
              <Link
                key={a.id}
                href={resourceLink(a.resource_type, a.workspace_id, a.resource_id)}
                className="block glass-card p-4 rounded-xl border border-white/5 hover:border-[#c39bff]/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#c39bff]/20 border border-[#c39bff]/30 flex items-center justify-center">
                    <Check size={14} className="text-[#c39bff]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">Assigned to you</p>
                    <p className="text-xs text-white/50">
                      {a.resource_type} · in {a.workspace_name}
                    </p>
                  </div>
                  <span className="text-[10px] text-white/30">
                    {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: typeof AtSign;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all ${
        active
          ? 'bg-[#c39bff]/20 border-[#c39bff]/30 text-[#c39bff]'
          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
      }`}
    >
      <Icon size={14} /> {label}
    </button>
  );
}
