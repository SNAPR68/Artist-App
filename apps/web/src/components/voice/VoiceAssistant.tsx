'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useVoiceRecognition } from './useVoiceRecognition';
import { VoiceWaveform } from './VoiceWaveform';
import { MiniArtistCard } from './MiniArtistCard';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../lib/auth';

type AssistantState = 'idle' | 'listening' | 'processing' | 'responding';

interface VoiceResponse {
  response_text: string;
  suggestions?: string[];
  intent?: string;
  confidence?: number;
  session_id: string;
  action?: { type: 'navigate' | 'execute'; route?: string; params?: Record<string, unknown> };
  data?: Record<string, unknown>;
}

interface DiscoverArtist {
  id: string;
  stage_name: string;
  genres?: string[];
  trust_score?: number;
  base_city?: string;
  thumbnail_url?: string | null;
  bio?: string | null;
  total_bookings?: number;
  is_verified?: boolean;
  price_range_min?: number | null;
  price_range_max?: number | null;
  min_price?: number | null;
  min_paise?: number | null;
  pricing?: Array<{ min_price?: number; max_price?: number; min_paise?: number; max_paise?: number }>;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  suggestions?: string[];
  action?: VoiceResponse['action'];
  data?: Record<string, unknown>;
  artists?: DiscoverArtist[];
}

export function VoiceAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition();

  const [state, setState] = useState<AssistantState>('idle');
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // When transcript is finalized, send query
  const sendQueryCb = useCallback(
    async (text: string) => {
      setState('processing');
      setMessages((prev) => [...prev, { role: 'user', text }]);

      try {
        const body: Record<string, string> = { text, current_page: pathname ?? 'home' };
        if (sessionId) body.session_id = sessionId;
        const res = await apiClient<VoiceResponse>('/v1/voice/query', {
          method: 'POST',
          body: JSON.stringify(body),
        });

        if (res.success && res.data) {
          const data = res.data;
          setSessionId(data.session_id);

          // Extract artists from DISCOVER responses
          const artists = (data.data?.artists as DiscoverArtist[]) ?? undefined;

          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              text: data.response_text,
              suggestions: data.suggestions,
              action: data.action,
              data: data.data,
              artists,
            },
          ]);

          // Voice output
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(data.response_text);
            utterance.lang = 'en-IN';
            utterance.rate = 1.0;
            utterance.onend = () => setState('idle');
            speechSynthesis.speak(utterance);
            setState('responding');
          } else {
            setState('idle');
          }

          // Handle navigation action
          if (data.action?.type === 'navigate' && data.action.route) {
            const route = data.action.route;
            setTimeout(() => {
              router.push(route);
              setIsOpen(false);
            }, 1500);
          }
        } else {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', text: 'Sorry, something went wrong. Try again.' },
          ]);
          setState('idle');
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'Connection error. Please try again.' },
        ]);
        setState('idle');
      }
    },
    [sessionId, pathname, router]
  );

  useEffect(() => {
    if (!isListening && transcript && state === 'listening') {
      sendQueryCb(transcript);
      resetTranscript();
    }
  }, [isListening, transcript, state, sendQueryCb, resetTranscript]);

  function handleMicClick() {
    if (state === 'listening') {
      stopListening();
    } else if (state === 'idle') {
      setState('listening');
      startListening();
    }
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendQueryCb(textInput.trim());
    setTextInput('');
  }

  function handleSuggestionClick(suggestion: string) {
    const bookMatch = suggestion.match(/^book\s+(.+)/i);
    const moreMatch = suggestion.match(/^tell me more about\s+(.+)/i);
    const artistName = (bookMatch?.[1] || moreMatch?.[1])?.trim();

    if (artistName) {
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.data);
      const artists = (lastAssistantMsg?.data?.artists as Array<Record<string, unknown>>) ?? [];
      const match = artists.find(a =>
        (a.stage_name as string)?.toLowerCase() === artistName.toLowerCase()
      );
      if (match?.id) {
        router.push(`/artists/${match.id}`);
      } else {
        router.push(`/search?q=${encodeURIComponent(artistName)}`);
      }
      setIsOpen(false);
      return;
    }
    sendQueryCb(suggestion);
  }

  function handleNavigateAction(route: string) {
    router.push(route);
    setIsOpen(false);
  }

  // Don't render if not authenticated or not mounted (prevents hydration mismatch)
  if (!mounted || !user) return null;

  return (
    <>
      {/* ─── FAB: ArtistBook Concierge Button ─── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-modal flex items-center gap-2 rounded-pill bg-gradient-accent text-white shadow-glow-md hover:shadow-glow-lg transition-all duration-300 hover:scale-105 px-4 py-3 md:px-5 md:py-3.5 animate-pulse-glow"
          aria-label="ArtistBook Concierge"
        >
          {/* Sparkles icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
          </svg>
          <span className="text-sm font-semibold hidden sm:inline">Concierge</span>
        </button>
      )}

      {/* ─── Chat Panel ─── */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-modal md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 z-modal md:w-[400px] md:h-[560px] md:rounded-2xl flex flex-col overflow-hidden bg-surface-base/[0.97] backdrop-blur-glass-lg border-0 md:border md:border-glass-border md:shadow-glass animate-scale-in">
            {/* ─── Header ─── */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-surface-card/80 backdrop-blur-glass border-b border-glass-border">
              <div className="flex items-center gap-2.5">
                {/* Back arrow on mobile */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="md:hidden p-1 text-text-muted hover:text-text-primary transition-colors"
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                {/* Sparkle icon */}
                <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-text-primary text-sm leading-tight">
                    ArtistBook Concierge
                  </h3>
                  <p className="text-[10px] text-text-muted leading-tight">
                    Your personal entertainment assistant
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isSupported && (
                  <span className="text-[10px] text-warning px-1.5 py-0.5 rounded bg-warning/10">No mic</span>
                )}
                {/* Close (desktop) */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="hidden md:flex p-1.5 text-text-muted hover:text-text-primary hover:bg-glass-light rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ─── Messages ─── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-hide">
              {messages.length === 0 && (
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-accent-subtle flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-violet">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-secondary">How can I help?</p>
                    <p className="text-xs text-text-muted mt-1">
                      Speak or type to find artists, check bookings, get insights
                    </p>
                  </div>
                  {/* Quick action chips */}
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {[
                      'Find a DJ for wedding in Mumbai',
                      'Show my bookings',
                      'Show my earnings',
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => sendQueryCb(q)}
                        className="text-xs bg-glass-light border border-glass-border text-text-secondary rounded-pill px-3 py-1.5 hover:bg-glass-medium hover:border-primary-500/30 hover:text-text-primary transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] space-y-2 ${msg.role === 'user' ? '' : ''}`}>
                    {/* Message bubble */}
                    <div
                      className={`rounded-2xl px-4 py-2.5 ${
                        msg.role === 'user'
                          ? 'bg-gradient-accent text-white'
                          : 'bg-glass-medium border border-glass-border text-text-primary'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>
                    </div>

                    {/* ─── Artist Cards Strip ─── */}
                    {msg.artists && msg.artists.length > 0 && (
                      <div className="-mx-4">
                        <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory">
                          {msg.artists.map((artist) => (
                            <MiniArtistCard key={artist.id} {...artist} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Navigation action card */}
                    {msg.action?.type === 'navigate' && msg.action.route && (
                      <button
                        onClick={() => handleNavigateAction(msg.action!.route!)}
                        className="flex items-center gap-2 w-full text-left text-xs bg-glass-light border border-glass-border text-primary-400 rounded-lg px-3 py-2 hover:bg-glass-medium hover:border-primary-500/30 transition-all"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                        Go to page
                      </button>
                    )}

                    {/* Suggestion chips */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.suggestions.map((s, j) => (
                          <button
                            key={j}
                            onClick={() => handleSuggestionClick(s)}
                            className="text-xs bg-glass-light border border-glass-border text-text-secondary rounded-pill px-2.5 py-1 hover:bg-glass-medium hover:border-primary-500/30 hover:text-text-primary transition-all"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* ─── Status Bar ─── */}
            {state === 'listening' && (
              <div className="shrink-0 px-4 py-2 text-center border-t border-glass-border bg-surface-card/60">
                <VoiceWaveform isActive={true} />
                {interimTranscript && (
                  <p className="text-xs text-text-muted italic mt-1">{interimTranscript}</p>
                )}
                <p className="text-xs text-primary-400 mt-1">Listening...</p>
              </div>
            )}
            {state === 'processing' && (
              <div className="shrink-0 px-4 py-2 text-center border-t border-glass-border bg-surface-card/60">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-violet animate-pulse [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-magenta animate-pulse [animation-delay:0.4s]" />
                </div>
                <p className="text-xs text-text-muted mt-1">Thinking...</p>
              </div>
            )}
            {state === 'responding' && (
              <div className="shrink-0 px-4 py-2 text-center border-t border-glass-border bg-surface-card/60">
                <p className="text-xs text-accent-violet animate-pulse">Speaking...</p>
              </div>
            )}

            {/* ─── Input Area ─── */}
            <div className="shrink-0 px-3 py-3 border-t border-glass-border bg-surface-card/80 backdrop-blur-glass flex items-center gap-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
              {/* Mic button */}
              <button
                onClick={handleMicClick}
                disabled={!isSupported || state === 'processing' || state === 'responding'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  state === 'listening'
                    ? 'bg-red-500/90 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                    : 'bg-glass-medium border border-glass-border text-text-primary hover:bg-glass-heavy'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                aria-label={state === 'listening' ? 'Stop listening' : 'Start voice input'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </button>

              {/* Text input */}
              <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2 items-center">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="flex-1 bg-surface-elevated border border-glass-border rounded-pill px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
                  disabled={state !== 'idle'}
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || state !== 'idle'}
                  className="text-primary-400 hover:text-primary-300 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4z" />
                    <path d="m22 2-11 11" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
