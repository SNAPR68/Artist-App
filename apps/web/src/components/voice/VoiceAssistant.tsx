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

  // ─── Helper: extract search params from natural language (for unauthenticated visitors) ───
  function extractSearchParams(text: string): { q?: string; genre?: string; city?: string } {
    const lower = text.toLowerCase();
    const params: { q?: string; genre?: string; city?: string } = {};

    // Detect city names
    const cities = ['mumbai', 'delhi', 'bangalore', 'bengaluru', 'chennai', 'hyderabad', 'pune', 'kolkata', 'jaipur', 'ahmedabad', 'goa', 'lucknow', 'chandigarh', 'noida', 'gurgaon'];
    for (const city of cities) {
      if (lower.includes(city)) { params.city = city.charAt(0).toUpperCase() + city.slice(1); break; }
    }

    // Detect genre/category — values must match API facet values
    const genres: Record<string, string> = {
      'dj': 'EDM', 'edm': 'EDM', 'electronic': 'Electronic',
      'singer': 'Bollywood', 'vocalist': 'Bollywood', 'bollywood': 'Bollywood',
      'band': 'Live Band', 'live band': 'Live Band',
      'comedian': 'Comedy', 'comedy': 'Comedy', 'standup': 'Comedy',
      'dancer': 'Folk', 'dance': 'Folk',
      'classical': 'Classical', 'ghazal': 'Ghazal', 'sufi': 'Sufi',
      'jazz': 'Jazz', 'rock': 'Rock', 'pop': 'Pop', 'folk': 'Folk',
      'hip-hop': 'Hip-Hop', 'hiphop': 'Hip-Hop', 'rap': 'Hip-Hop',
      'fusion': 'Fusion', 'qawwali': 'Qawwali', 'acoustic': 'Acoustic',
      'techno': 'Techno', 'house': 'House', 'wedding': 'Wedding',
      'brass': 'Brass Band', 'rajasthani': 'Rajasthani',
    };
    for (const [keyword, genre] of Object.entries(genres)) {
      if (lower.includes(keyword)) { params.genre = genre; break; }
    }

    // Only use q when no genre was detected — extract keywords, not full sentence
    if (!params.genre) {
      const stopWords = ['find', 'show', 'me', 'a', 'an', 'the', 'for', 'in', 'near', 'around', 'i', 'want', 'need', 'looking', 'get', 'book', 'hire', 'best', 'top', 'good'];
      const words = lower.split(/\s+/).filter(w => !stopWords.includes(w) && w.length > 1);
      const cityLower = params.city?.toLowerCase();
      const searchWords = cityLower ? words.filter(w => w !== cityLower) : words;
      if (searchWords.length > 0) params.q = searchWords.slice(0, 2).join(' ');
    }
    return params;
  }

  // ─── Helper: check if query needs authentication ───
  function isAuthRequiredQuery(text: string): boolean {
    const lower = text.toLowerCase();
    const authKeywords = ['my booking', 'my earning', 'my payment', 'my profile', 'my calendar', 'my wallet', 'my payout', 'my review'];
    return authKeywords.some(kw => lower.includes(kw));
  }

  // ─── Helper: speak response text via TTS ───
  function speakResponse(text: string) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      utterance.rate = 1.0;
      utterance.onend = () => setState('idle');
      speechSynthesis.speak(utterance);
      setState('responding');
    } else {
      setState('idle');
    }
  }

  // ─── Unauthenticated discovery via public search API ───
  const handleGuestQuery = useCallback(
    async (text: string) => {
      // Check if query requires auth → redirect to login
      if (isAuthRequiredQuery(text)) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: 'You need to sign in to access your bookings, earnings, and profile. Would you like to log in?',
            suggestions: ['Log in now', 'Find a DJ in Mumbai', 'Show me singers'],
            action: { type: 'navigate', route: '/login' },
          },
        ]);
        speakResponse('You need to sign in to access that feature. Would you like to log in?');
        return;
      }

      // Check for category browsing intent
      const lower = text.toLowerCase();
      if (lower.includes('categor') || lower.includes('what do you have') || lower.includes('what kind')) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: 'We have 10+ categories of artists! Here are the most popular ones:\n\n🎤 Singers & Vocalists (500+)\n🎧 DJs & Electronic (400+)\n🎸 Live Bands (350+)\n😂 Comedians (300+)\n💃 Dancers (250+)\n📸 Photographers (250+)\n\nWhat type of artist are you looking for?',
            suggestions: ['Find a singer', 'Find a DJ', 'Find a band', 'Find a comedian'],
          },
        ]);
        speakResponse('We have singers, DJs, bands, comedians, dancers, photographers, and more. What type of artist are you looking for?');
        return;
      }

      // Search via public API
      const searchParams = extractSearchParams(text);
      const queryParts: string[] = [];
      if (searchParams.q) queryParts.push(`q=${encodeURIComponent(searchParams.q)}`);
      if (searchParams.genre) queryParts.push(`genre=${encodeURIComponent(searchParams.genre)}`);
      if (searchParams.city) queryParts.push(`city=${encodeURIComponent(searchParams.city)}`);
      queryParts.push('per_page=5');

      try {
        // Search API returns { success, data: [artists], meta: { total } }
        // Add timeout for Render cold starts (~30-60s)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        const res = await apiClient<DiscoverArtist[]>(
          `/v1/search/artists?${queryParts.join('&')}`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = res as any;

        if (res.success && res.data) {
          const artists: DiscoverArtist[] = Array.isArray(res.data) ? res.data : [];
          const total: number = raw.meta?.total ?? artists.length;

          if (artists.length > 0) {
            const cityInfo = searchParams.city ? ` in ${searchParams.city}` : '';
            const genreInfo = searchParams.genre ? ` ${searchParams.genre}` : ' artists';
            const responseText = `Found ${total}${genreInfo}${cityInfo}! Here are the top picks:`;
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                text: responseText,
                suggestions: ['Show me more', 'Find in another city', 'Sign in to book'],
                artists,
                data: { artists } as unknown as Record<string, unknown>,
              },
            ]);
            speakResponse(`Found ${total}${genreInfo}${cityInfo}. Showing you the top picks.`);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                text: 'I couldn\'t find artists matching that query. Try a different city or category!',
                suggestions: ['Find a DJ in Mumbai', 'Show me singers in Delhi', 'What categories do you have?'],
              },
            ]);
            speakResponse('I couldn\'t find artists matching that. Try a different city or category.');
          }
        } else {
          throw new Error('Search failed');
        }
      } catch (err) {
        const isTimeout = err instanceof DOMException && err.name === 'AbortError';
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: isTimeout
              ? 'Our server is waking up (free tier). Please try again in a few seconds!'
              : 'Sorry, something went wrong. Please try again.',
            suggestions: ['Find a DJ in Mumbai', 'Show me singers in Delhi', 'What categories do you have?'],
          },
        ]);
        setState('idle');
      }
    },
    [router]
  );

  // When transcript is finalized, send query
  const sendQueryCb = useCallback(
    async (text: string) => {
      setState('processing');
      setMessages((prev) => [...prev, { role: 'user', text }]);

      // If user is NOT logged in, use guest discovery mode
      if (!user) {
        await handleGuestQuery(text);
        return;
      }

      // Authenticated user — full voice query API
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
          speakResponse(data.response_text);

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
    [sessionId, pathname, router, user, handleGuestQuery]
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
    const lower = suggestion.toLowerCase();

    // Handle login/sign-in suggestions for unauthenticated users
    if (lower === 'log in now' || lower === 'sign in to book') {
      router.push('/login');
      setIsOpen(false);
      return;
    }

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

  // Don't render until mounted (prevents hydration mismatch)
  // Concierge is available for ALL visitors — logged in or not
  if (!mounted) return null;

  // Sparkle SVG reused in header and collapsed widget
  const sparkleIcon = (size: number, color = 'currentColor') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );

  const guestChips = [
    'Find a DJ for wedding in Mumbai',
    'Show me singers in Delhi',
    'What categories do you have?',
  ];
  const authChips = [
    'Find a DJ for wedding in Mumbai',
    'Show my bookings',
    'Show my earnings',
  ];

  return (
    <>
      {/* ─── Collapsed: Compact chat bar (doesn't overlap content) ─── */}
      {!isOpen && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-modal animate-scale-in">
          <div className="flex items-center gap-2 rounded-full border border-glass-border bg-surface-base/[0.97] backdrop-blur-glass-lg shadow-glass pl-1.5 pr-3 py-1.5 cursor-pointer hover:shadow-glow-md transition-all" onClick={() => setIsOpen(true)}>
            {/* Mic button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Start listening IMMEDIATELY in the click handler (user gesture required by Web Speech API)
                setState('listening');
                startListening();
                // Then open the panel
                setIsOpen(true);
              }}
              disabled={!isSupported}
              className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center text-white shrink-0 shadow-glow-sm hover:shadow-glow-md hover:scale-105 transition-all disabled:opacity-40"
              aria-label="Tap to speak"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </button>
            {/* Label */}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-text-primary leading-tight">ArtistChat</span>
              <span className="text-[10px] text-text-muted leading-tight">Ask or speak to find artists</span>
            </div>
            {/* Online dot */}
            <span className="relative flex h-2 w-2 shrink-0 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
          </div>
        </div>
      )}

      {/* ─── Expanded Chat Panel ─── */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-modal md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 z-modal md:w-[400px] md:h-[600px] md:rounded-2xl flex flex-col overflow-hidden bg-surface-base/[0.97] backdrop-blur-glass-lg border-0 md:border md:border-glass-border md:shadow-glass animate-scale-in">
            {/* ─── Header ─── */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-600 to-accent-violet">
              <div className="flex items-center gap-2.5">
                {/* Back arrow on mobile */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="md:hidden p-1 text-white/80 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  {sparkleIcon(16, 'white')}
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-white text-sm leading-tight">
                    ArtistChat
                  </h3>
                  <p className="text-[10px] text-white/70 leading-tight">
                    AI-powered artist discovery
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isSupported && (
                  <span className="text-[10px] text-yellow-200 px-1.5 py-0.5 rounded bg-white/10">No mic</span>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Minimize"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 12h12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ─── Messages ─── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-hide">
              {messages.length === 0 && (
                <div className="space-y-4 pt-4">
                  {/* Welcome message as chat bubble */}
                  <div className="flex justify-start">
                    <div className="max-w-[90%] space-y-3">
                      <div className="rounded-2xl px-4 py-3 bg-glass-medium border border-glass-border text-text-primary">
                        <p className="text-sm leading-relaxed">
                          {user
                            ? 'Hey! I can help you find artists, check bookings, manage your calendar, and more. What do you need?'
                            : 'Hey! I\'m your AI assistant for finding the perfect artist. Tell me about your event and I\'ll find the best match — DJs, singers, bands, comedians, and more across India.'}
                        </p>
                      </div>
                      {/* Quick action chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {(user ? authChips : guestChips).map((q) => (
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

                    {/* ─── Artist Cards ─── */}
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
                  placeholder="Ask about artists, pricing, events..."
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
