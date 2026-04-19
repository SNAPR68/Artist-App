'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Trash2, AtSign } from 'lucide-react';
import { apiClient } from '../../lib/api-client';

interface Member {
  user_id: string;
  email?: string | null;
  phone?: string | null;
}

interface Comment {
  id: string;
  body: string;
  mentioned_user_ids: string[];
  author_user_id: string;
  author_email: string | null;
  author_phone: string | null;
  created_at: string;
}

interface Props {
  workspaceId: string;
  resourceType: 'event' | 'booking' | 'presentation';
  resourceId: string;
  currentUserId: string;
}

/**
 * CommentThread — collaborative comments on any workspace resource.
 * Supports @mentions. Autocompletes from workspace members.
 * Embed anywhere: <CommentThread workspaceId={...} resourceType="event" resourceId={...} currentUserId={...} />
 */
export function CommentThread({ workspaceId, resourceType, resourceId, currentUserId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [draft, setDraft] = useState('');
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [commentsRes, membersRes] = await Promise.all([
      apiClient<Comment[]>(`/v1/workspaces/${workspaceId}/comments?resource_type=${resourceType}&resource_id=${resourceId}`),
      apiClient<Member[]>(`/v1/workspaces/${workspaceId}/members`),
    ]);
    if (commentsRes.success) setComments(Array.isArray(commentsRes.data) ? commentsRes.data : []);
    if (membersRes.success) setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
    setLoading(false);
  }, [workspaceId, resourceType, resourceId]);

  useEffect(() => { load(); }, [load]);

  const nameFor = (m: Pick<Member, 'email' | 'phone'>) => m.email ?? m.phone ?? 'Member';

  const insertMention = (member: Member) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const before = draft.slice(0, textarea.selectionStart).replace(/@\w*$/, '');
    const after = draft.slice(textarea.selectionStart);
    const newDraft = `${before}@${nameFor(member)} `;
    setDraft(newDraft + after);
    setMentionedIds((ids) => (ids.includes(member.user_id) ? ids : [...ids, member.user_id]));
    setShowMentionMenu(false);
    textarea.focus();
  };

  const onDraftChange = (v: string) => {
    setDraft(v);
    setShowMentionMenu(/@\w*$/.test(v.slice(0, textareaRef.current?.selectionStart ?? v.length)));
  };

  const submit = async () => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    const res = await apiClient<Comment>(`/v1/workspaces/${workspaceId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        resource_type: resourceType,
        resource_id: resourceId,
        body: draft.trim(),
        mentioned_user_ids: mentionedIds,
      }),
    });
    if (res.success) {
      setDraft('');
      setMentionedIds([]);
      await load();
    }
    setPosting(false);
  };

  const remove = async (id: string) => {
    const res = await apiClient(`/v1/workspaces/${workspaceId}/comments/${id}`, { method: 'DELETE' });
    if (res.success) await load();
  };

  return (
    <div className="glass-card rounded-xl p-4 border border-white/10 space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare size={14} className="text-[#c39bff]" />
        <p className="text-sm font-bold text-white uppercase tracking-widest">
          Discussion {comments.length > 0 && <span className="text-white/40">· {comments.length}</span>}
        </p>
      </div>

      {/* Comments list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {loading ? (
          <p className="text-xs text-white/40 py-4 text-center">Loading…</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-white/40 py-4 text-center">No comments yet. Start the discussion.</p>
        ) : (
          comments.map((c) => {
            const isMine = c.author_user_id === currentUserId;
            const authorLabel = c.author_email ?? c.author_phone ?? 'Member';
            return (
              <div key={c.id} className="bg-white/[0.03] border border-white/5 rounded-lg p-3 group">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#c39bff]/20 border border-[#c39bff]/30 flex items-center justify-center text-[10px] font-bold text-[#c39bff]">
                      {authorLabel[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span className="text-xs font-bold text-white">{authorLabel}</span>
                    <span className="text-[10px] text-white/30">
                      {new Date(c.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {isMine && (
                    <button
                      onClick={() => remove(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-opacity"
                      title="Delete comment"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-white/80 whitespace-pre-wrap pl-8">{c.body}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-white/10 pt-3 relative">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
            if (e.key === 'Escape') setShowMentionMenu(false);
          }}
          placeholder="Add a comment. Use @ to mention teammates. Cmd+Enter to send."
          rows={2}
          className="input-nocturne w-full resize-none text-sm"
        />

        {showMentionMenu && members.length > 0 && (
          <div className="absolute bottom-full left-0 mb-2 w-64 glass-card rounded-lg border border-white/10 max-h-48 overflow-y-auto z-20">
            {members.filter((m) => m.user_id !== currentUserId).map((m) => (
              <button
                key={m.user_id}
                onClick={() => insertMention(m)}
                className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 text-xs text-white/80 border-b border-white/5 last:border-0"
              >
                <AtSign size={12} className="text-[#c39bff]" />
                {nameFor(m)}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-white/30">
            {mentionedIds.length > 0 && `Notifying ${mentionedIds.length} teammate${mentionedIds.length === 1 ? '' : 's'}`}
          </p>
          <button
            onClick={submit}
            disabled={!draft.trim() || posting}
            className="bg-[#c39bff] text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#b48af0] disabled:opacity-40 flex items-center gap-1"
          >
            <Send size={12} />
            {posting ? 'Sending…' : 'Comment'}
          </button>
        </div>
      </div>
    </div>
  );
}
