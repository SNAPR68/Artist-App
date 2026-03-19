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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voice Assistant</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ask anything about bookings, earnings, demand, or artist search.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleNewSession}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5"
          >
            New Chat
          </button>
        )}
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-lg border border-gray-200 min-h-[400px] flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm py-20">
              Start a conversation...
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary-100 text-primary-900'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {msg.intent && (
                  <span className="inline-block text-xs px-1.5 py-0.5 rounded bg-primary-200 text-primary-700 mb-1 mr-1">
                    {msg.intent}
                  </span>
                )}
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.action?.type === 'navigate' && msg.action.route && (
                  <button
                    onClick={() => router.push(msg.action!.route!)}
                    className="mt-2 text-xs bg-primary-50 text-primary-700 border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-100 transition-colors"
                  >
                    Go to page &rarr;
                  </button>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2.5">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {lastAssistant?.suggestions && lastAssistant.suggestions.length > 0 && (
          <div className="px-4 pb-2 flex gap-2 flex-wrap">
            {lastAssistant.suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s)}
                disabled={sending}
                className="text-xs bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full hover:bg-primary-100 transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask me anything... e.g. 'band chahiye Jaipur mein'"
            disabled={sending}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="bg-primary-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>

      {/* Past Sessions */}
      {sessions.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 mb-2">Past Sessions</h2>
          <div className="space-y-1">
            {sessions.slice(0, 5).map((s) => (
              <div key={s.id} className="text-xs text-gray-500 flex items-center gap-2">
                <span>
                  {new Date(s.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <span>&middot;</span>
                <span>{s.message_count} messages</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
