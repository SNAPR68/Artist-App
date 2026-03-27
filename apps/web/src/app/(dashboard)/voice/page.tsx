'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  intent?: string;
  suggestions?: string[];
  action?: { type: 'navigate' | 'execute'; route?: string; params?: Record<string, unknown> };
}

interface VoiceQueryResponse {
  response_text: string;
  intent?: string;
  suggestions?: string[];
  session_id: string;
  action?: { type: 'navigate' | 'execute'; route?: string; params?: Record<string, unknown> };
}

interface VoiceSession {
  id: string;
  created_at: string;
  message_count: number;
}

export default function VoicePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiClient<VoiceSession[]>('/v1/voice/sessions')
      .then((res) => {
        if (res.success) setSessions(res.data);
      })
      .catch(console.error)
      .finally(() => setLoadingSessions(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text?: string) {
    const query = (text ?? inputText).trim();
    if (!query || sending) return;

    setInputText('');
    const userMsg: ChatMessage = { role: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const body: Record<string, string> = { text: query };
      if (sessionId) body.session_id = sessionId;

      const res = await apiClient<VoiceQueryResponse>('/v1/voice/query', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.success) {
        const data = res.data;
        if (!sessionId && data.session_id) setSessionId(data.session_id);
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          text: data.response_text,
          intent: data.intent,
          suggestions: data.suggestions,
          action: data.action,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'Sorry, something went wrong. Please try again.' },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Connection error. Please try again.' },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSend();
  }

  function handleNewSession() {
    setMessages([]);
    setSessionId(null);
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

  if (loadingSessions) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c39bff]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Ambient glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#c39bff]/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#a1faff]/5 blur-3xl rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div>
          <h1 className="text-4xl font-display font-bold text-white">Voice Dashboard</h1>
          <p className="text-sm text-white/50 mt-2">
            Ask anything about bookings, earnings, demand, or artist search.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleNewSession}
            className="text-sm text-white/50 hover:text-white border border-white/10 rounded-lg px-4 py-2.5 transition-colors"
          >
            New Chat
          </button>
        )}
      </div>

      {/* Chat Container */}
      <div className="glass-card rounded-2xl border border-white/10 min-h-[500px] flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-white/50 text-sm py-20">
              <div className="text-center">
                <p className="mb-2">Start a conversation...</p>
                <p className="text-xs text-white/40">e.g., "How many gigs am I shortlisted for?" or "What's my balance?"</p>
              </div>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#c39bff] text-white'
                    : 'bg-white/5 text-white border border-white/10'
                }`}
              >
                {msg.intent && (
                  <span className="inline-block text-xs px-2 py-1 rounded bg-white/10 text-white/70 mb-2 mr-2">
                    {msg.intent}
                  </span>
                )}
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.action?.type === 'navigate' && msg.action.route && (
                  <button
                    onClick={() => router.push(msg.action!.route!)}
                    className="mt-3 text-xs bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-lg px-3 py-2 transition-all"
                  >
                    Go to page →
                  </button>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="glass-card rounded-2xl px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {lastAssistant?.suggestions && lastAssistant.suggestions.length > 0 && (
          <div className="px-6 py-3 flex gap-2 flex-wrap border-t border-white/10">
            {lastAssistant.suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s)}
                disabled={sending}
                className="text-xs bg-white/5 hover:bg-white/10 text-[#c39bff] px-3 py-2 rounded-full border border-white/10 transition-all disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-white/10 p-4 flex gap-3 bg-white/5">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask me anything... e.g. 'Show my bookings'"
            disabled={sending}
            className="input-nocturne flex-1 rounded-lg px-4 py-3"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="btn-nocturne-primary px-6 py-3 rounded-lg disabled:opacity-50 font-semibold"
          >
            Send
          </button>
        </form>
      </div>

      {/* Past Sessions Sidebar */}
      {sessions.length > 0 && (
        <section className="glass-card rounded-2xl border border-white/10 p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Past Sessions</h2>
          <div className="space-y-2">
            {sessions.slice(0, 5).map((s) => (
              <div key={s.id} className="text-xs text-white/50 flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                <span>
                  {new Date(s.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <span>•</span>
                <span>{s.message_count} messages</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
