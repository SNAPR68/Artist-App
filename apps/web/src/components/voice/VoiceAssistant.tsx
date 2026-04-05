'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useVoiceRecognition } from './useVoiceRecognition';
import { VoiceWaveform } from './VoiceWaveform';
import { MiniArtistCard } from './MiniArtistCard';
import { CardRenderer } from './cards/CardRenderer';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../lib/auth';
import type { VoiceCard, VoiceFollowUp } from '@artist-booking/shared';

type AssistantState = 'idle' | 'listening' | 'processing' | 'responding';

interface VoiceResponse {
  response_text: string;
  suggestions?: string[];
  intent?: string;
  confidence?: number;
  session_id: string;
  action?: { type: 'navigate' | 'execute'; route?: string; params?: Record<string, unknown> };
  data?: Record<string, unknown>;
  cards?: VoiceCard[];
  follow_up?: VoiceFollowUp;
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
  cards?: VoiceCard[];
  follow_up?: VoiceFollowUp;
}

// ─── Mascot Avatars ─────────────────────────────────────────
function ZaraMascot({ size = 28, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={glow ? 'drop-shadow-[0_0_6px_rgba(195,155,255,0.6)]' : ''}>
      <circle cx="20" cy="20" r="20" fill="#c39bff" fillOpacity={glow ? 0.25 : 0.15} />
      <circle cx="20" cy="20" r="18" stroke="#c39bff" strokeWidth="1.5" strokeOpacity={glow ? 0.8 : 0.3} fill="none" />
      {/* Face */}
      <circle cx="20" cy="16" r="6" fill="#c39bff" fillOpacity={glow ? 0.9 : 0.5} />
      {/* Hair — flowing */}
      <path d="M14 14c0-4 3-7 6-7s6 3 6 7c1-1 2-3 2-5 0 0 1 4-1 7-1 1.5-2.5 2-3 2h-6c-.5 0-2-.5-3-2-2-3-1-7-1-7 0 2 1 4 2 5z" fill="#c39bff" fillOpacity={glow ? 0.7 : 0.35} />
      {/* Body */}
      <path d="M12 32c0-5 3.5-8 8-8s8 3 8 8" fill="#c39bff" fillOpacity={glow ? 0.6 : 0.3} />
      {/* Headphone band */}
      <path d="M11 16a9 9 0 0118 0" stroke="#c39bff" strokeWidth="1.5" strokeOpacity={glow ? 0.9 : 0.4} fill="none" strokeLinecap="round" />
      {/* Headphone cups */}
      <rect x="9" y="14" width="4" height="5" rx="2" fill="#c39bff" fillOpacity={glow ? 0.8 : 0.4} />
      <rect x="27" y="14" width="4" height="5" rx="2" fill="#c39bff" fillOpacity={glow ? 0.8 : 0.4} />
    </svg>
  );
}

function KabirMascot({ size = 28, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={glow ? 'drop-shadow-[0_0_6px_rgba(161,250,255,0.6)]' : ''}>
      <circle cx="20" cy="20" r="20" fill="#a1faff" fillOpacity={glow ? 0.25 : 0.15} />
      <circle cx="20" cy="20" r="18" stroke="#a1faff" strokeWidth="1.5" strokeOpacity={glow ? 0.8 : 0.3} fill="none" />
      {/* Face */}
      <circle cx="20" cy="16" r="6" fill="#a1faff" fillOpacity={glow ? 0.9 : 0.5} />
      {/* Hair — short cropped */}
      <path d="M14 14c0-4 3-7 6-7s6 3 6 7c0-2-2-5-6-5s-6 3-6 5z" fill="#a1faff" fillOpacity={glow ? 0.7 : 0.35} />
      {/* Body — broader shoulders */}
      <path d="M10 32c0-5 4-9 10-9s10 4 10 9" fill="#a1faff" fillOpacity={glow ? 0.6 : 0.3} />
      {/* Headphone band */}
      <path d="M11 16a9 9 0 0118 0" stroke="#a1faff" strokeWidth="1.5" strokeOpacity={glow ? 0.9 : 0.4} fill="none" strokeLinecap="round" />
      {/* Headphone cups */}
      <rect x="9" y="14" width="4" height="5" rx="2" fill="#a1faff" fillOpacity={glow ? 0.8 : 0.4} />
      <rect x="27" y="14" width="4" height="5" rx="2" fill="#a1faff" fillOpacity={glow ? 0.8 : 0.4} />
    </svg>
  );
}

function ActiveMascot({ lang, size = 20 }: { lang: 'en' | 'hi'; size?: number }) {
  return lang === 'en' ? <ZaraMascot size={size} glow /> : <KabirMascot size={size} glow />;
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
    permissionDenied,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition();

  const [state, setState] = useState<AssistantState>('idle');
  const [isOpen, setIsOpen] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [cloudTTSAvailable, setCloudTTSAvailable] = useState(false);
  const [ttsLang, setTtsLang] = useState<'en' | 'hi'>('en');

  // Load available TTS voices — pick best English + Hindi only
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        // Curate: pick the single best English and Hindi voice
        const bestEnglish = available.find(v => v.lang === 'en-IN' && !v.name.includes('(Natural)') === false)
          || available.find(v => v.lang === 'en-IN')
          || available.find(v => v.name.includes('Samantha'))
          || available.find(v => v.name.includes('Karen'))
          || available.find(v => v.name.includes('Daniel'))
          || available.find(v => v.lang.startsWith('en-') && v.localService)
          || available.find(v => v.lang.startsWith('en-'));
        const bestHindi = available.find(v => v.lang === 'hi-IN' && !v.localService)
          || available.find(v => v.lang === 'hi-IN')
          || available.find(v => v.lang.startsWith('hi'));
        const curated = [bestEnglish, bestHindi].filter(Boolean) as SpeechSynthesisVoice[];
        setVoices(curated);
        if (!selectedVoiceURI && bestEnglish) {
          setSelectedVoiceURI(bestEnglish.voiceURI);
        }
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [selectedVoiceURI]);
  // Check if cloud TTS is available (ElevenLabs API key configured)
  useEffect(() => {
    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    })
      .then((res) => { if (res.status !== 503) setCloudTTSAvailable(true); })
      .catch(() => {});
  }, []);

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
    // Genre values MUST match DB values: Bollywood, Classical, Rock, Jazz, Electronic, Folk, Pop, Hip-Hop, Fusion, Sufi
    const genres: Record<string, string> = {
      'dj': 'Electronic', 'edm': 'Electronic', 'electronic': 'Electronic', 'techno': 'Electronic', 'house': 'Electronic',
      'singer': 'Bollywood', 'vocalist': 'Bollywood', 'bollywood': 'Bollywood',
      'classical': 'Classical', 'ghazal': 'Classical',
      'sufi': 'Sufi', 'qawwali': 'Sufi',
      'jazz': 'Jazz', 'rock': 'Rock', 'pop': 'Pop', 'folk': 'Folk',
      'hip-hop': 'Hip-Hop', 'hiphop': 'Hip-Hop', 'rap': 'Hip-Hop',
      'fusion': 'Fusion', 'acoustic': 'Fusion',
    };
    // Terms that search stage_name/bio via q= instead of genre filter
    const qMappings: Record<string, string> = {
      'band': 'band', 'live band': 'band',
      'comedian': 'comedy', 'comedy': 'comedy', 'standup': 'comedy',
      'dancer': 'dance', 'dance': 'dance',
    };
    for (const [keyword, searchTerm] of Object.entries(qMappings)) {
      if (lower.includes(keyword)) { params.q = searchTerm; return params; }
    }
    for (const [keyword, genre] of Object.entries(genres)) {
      if (lower.includes(keyword)) { params.genre = genre; break; }
    }

    // Only use q when no genre was detected — extract keywords, not full sentence
    if (!params.genre) {
      const stopWords = ['find', 'show', 'me', 'a', 'an', 'the', 'for', 'in', 'near', 'around', 'i', 'want', 'need', 'looking', 'get', 'book', 'hire', 'best', 'top', 'good', 'artists', 'artist', 'performer', 'performers', 'act', 'acts', 'talent', 'talents', 'please', 'can', 'you', 'some', 'any', 'all'];
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

  // ─── Helper: speak via browser TTS fallback ───
  const speakBrowser = useCallback((text: string) => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        if (selectedVoiceURI) {
          const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
          if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
        } else {
          utterance.lang = 'en-IN';
        }
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.onerror = () => setState('idle');
        utterance.onend = () => setState('idle');
        window.speechSynthesis.speak(utterance);
        setState('responding');
      } else {
        setState('idle');
      }
    } catch {
      setState('idle');
    }
  }, [voices, selectedVoiceURI]);

  // ─── Helper: speak response text via cloud TTS (ElevenLabs) with browser fallback ───
  const speakResponse = useCallback((text: string) => {
    setState('responding');

    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang: ttsLang, stream: true }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('cloud-tts-unavailable');

        // Use MediaSource for streaming playback when available
        if (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported('audio/mpeg') && res.body) {
          const mediaSource = new MediaSource();
          const audio = new Audio();
          audio.src = URL.createObjectURL(mediaSource);

          mediaSource.addEventListener('sourceopen', async () => {
            const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
            const reader = res.body!.getReader();

            const pump = async (): Promise<void> => {
              const { done, value } = await reader.read();
              if (done) {
                if (!sourceBuffer.updating) mediaSource.endOfStream();
                else sourceBuffer.addEventListener('updateend', () => mediaSource.endOfStream(), { once: true });
                return;
              }
              if (sourceBuffer.updating) {
                await new Promise<void>((resolve) => sourceBuffer.addEventListener('updateend', () => resolve(), { once: true }));
              }
              sourceBuffer.appendBuffer(value);
              await pump();
            };
            pump().catch(() => { /* stream ended */ });
          });

          audio.onended = () => setState('idle');
          audio.onerror = () => setState('idle');
          audio.play().catch(() => speakBrowser(text));
          return;
        }

        // Fallback: buffer full response
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => { setState('idle'); URL.revokeObjectURL(url); };
        audio.onerror = () => { setState('idle'); URL.revokeObjectURL(url); };
        audio.play().catch(() => {
          URL.revokeObjectURL(url);
          speakBrowser(text);
        });
      })
      .catch(() => {
        speakBrowser(text);
      });
  }, [ttsLang, speakBrowser]);

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

      // ─── InstaBook intent detection ───
      const lowerText = text.toLowerCase();
      const instabookKeywords = ['instabook', 'instant book', 'insta book', 'waitlist', 'wait list', 'fixed price', 'book instantly', 'instant booking'];
      const isInstabookQuery = instabookKeywords.some(kw => lowerText.includes(kw));

      if (isInstabookQuery) {
        const wantsToJoin = ['join', 'sign up', 'interested', 'yes', 'waitlist', 'sign me'].some(kw => lowerText.includes(kw));
        if (wantsToJoin) {
          const voiceSource = ttsLang === 'hi' ? 'voice_hi' : 'voice_en';
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: 'Taking you to the InstaBook waitlist form. Fill it out to get priority access when we launch!',
            suggestions: ['Back to home', 'Find a DJ in Mumbai'],
            action: { type: 'navigate', route: `/instabook?source=${voiceSource}` },
          }]);
          speakResponse('Taking you to the InstaBook waitlist. You will get priority access when we launch!');
          router.push(`/instabook?source=${voiceSource}`);
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: 'InstaBook is our upcoming feature that lets you book artists instantly at transparent prices — no negotiation, no middlemen. Your payment is escrow-protected until the event is done. Want to join the waitlist for early access?',
            suggestions: ['Join the waitlist', 'Tell me more', 'No thanks'],
          }]);
          speakResponse('InstaBook lets you book artists instantly at transparent prices, with escrow-protected payments. Would you like to join the waitlist for early access?');
        }
        return;
      }

      // ─── Check for navigation commands (guest-safe routes) ───
      const lower = text.toLowerCase();
      const navKeywords = ['go to', 'take me to', 'navigate to', 'open', 'show me the', 'switch to'];
      const isNavCommand = navKeywords.some(kw => lower.includes(kw));

      if (isNavCommand) {
        const guestRoutes: Record<string, { route: string; label: string }> = {
          'login': { route: '/login', label: 'login page' },
          'sign in': { route: '/login', label: 'login page' },
          'sign up': { route: '/login', label: 'sign up page' },
          'register': { route: '/login', label: 'registration page' },
          'search': { route: '/search', label: 'search page' },
          'find artist': { route: '/search', label: 'search page' },
          'explore': { route: '/search', label: 'explore artists' },
          'home': { route: '/', label: 'home page' },
          'event company': { route: '/login', label: 'event company login' },
          'event login': { route: '/login', label: 'event company login' },
          'artist login': { route: '/login', label: 'artist login' },
          'join': { route: '/login', label: 'sign up page' },
          'gigs': { route: '/gigs', label: 'gig listings' },
          'brief': { route: '/brief', label: 'event planner' },
          'plan event': { route: '/brief', label: 'event planner' },
          'plan my event': { route: '/brief', label: 'event planner' },
          'help me decide': { route: '/brief', label: 'event planner' },
          'recommend': { route: '/brief', label: 'event planner' },
          'privacy': { route: '/privacy', label: 'privacy policy' },
          'terms': { route: '/terms', label: 'terms of service' },
        };

        let matchedRoute: { route: string; label: string } | null = null;
        for (const [keyword, routeInfo] of Object.entries(guestRoutes)) {
          if (lower.includes(keyword)) {
            matchedRoute = routeInfo;
            break;
          }
        }

        const authPages = ['dashboard', 'booking', 'earning', 'payment', 'calendar', 'wallet', 'profile', 'workspace', 'setting', 'notification'];
        const needsAuth = authPages.some(p => lower.includes(p));

        if (needsAuth && !matchedRoute) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: 'You need to sign in to access that page. Would you like to log in?',
            suggestions: ['Log in now', 'Find a DJ in Mumbai', 'Explore artists'],
            action: { type: 'navigate', route: '/login' },
          }]);
          speakResponse('You need to sign in to access that page. Would you like to log in?');
          return;
        }

        if (matchedRoute) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: `Taking you to ${matchedRoute!.label}...`,
            suggestions: ['Find a DJ', 'Show me singers', 'Go home'],
            action: { type: 'navigate', route: matchedRoute!.route },
          }]);
          speakResponse(`Taking you to ${matchedRoute!.label}`);
          setTimeout(() => {
            router.push(matchedRoute!.route);
          }, 1000);
          return;
        }
      }

      // Check for category browsing intent
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
        // Timeout set to 90s to handle Render free-tier cold starts (~30-60s)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90000);

        // Show a "waking up" message if it takes more than 5s
        const wakeUpTimer = setTimeout(() => {
          setMessages((prev) => {
            // Only add if last message isn't already a wake-up notice
            const last = prev[prev.length - 1];
            if (last?.text?.includes('waking up')) return prev;
            return [
              ...prev,
              {
                role: 'assistant' as const,
                text: 'Our server is waking up (free tier) — this can take up to 60 seconds on first request. Hang tight!',
              },
            ];
          });
        }, 5000);

        const res = await apiClient<DiscoverArtist[]>(
          `/v1/search/artists?${queryParts.join('&')}`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        clearTimeout(wakeUpTimer);
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
              ? 'The server took too long to respond. It may still be waking up — please try again.'
              : 'Sorry, something went wrong. Please try again.',
            suggestions: ['Try again', 'Find a DJ in Mumbai', 'Show me singers in Delhi'],
          },
        ]);
        setState('idle');
      }
    },
    [router, speakResponse]
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

          // Extract artists from DISCOVER responses (legacy)
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
              cards: data.cards,
              follow_up: data.follow_up,
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
    [sessionId, pathname, router, user, handleGuestQuery, speakResponse]
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
      startListening().then(() => {
        // If permission was denied, startListening sets permissionDenied and resets isListening
        // Reset our local state too
      });
    }
  }

  // If voice recognition stops due to permission denial, reset our state
  useEffect(() => {
    if (permissionDenied && state === 'listening') {
      setState('idle');
    }
  }, [permissionDenied, state]);

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

  // Listen for custom event from hero mascots to open with a specific language
  useEffect(() => {
    const handler = (e: Event) => {
      const lang = (e as CustomEvent).detail?.lang as 'en' | 'hi';
      if (lang) setTtsLang(lang);
      setIsOpen(true);
    };
    window.addEventListener('open-voice-assistant', handler);
    return () => window.removeEventListener('open-voice-assistant', handler);
  }, []);

  // Don't render until mounted (prevents hydration mismatch)
  // Concierge is available for ALL visitors — logged in or not
  if (!mounted) return null;


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
      {/* ─── Collapsed: 3D Mascot Circles (bottom-right) — hidden on homepage ─── */}
      {!isOpen && pathname !== '/' && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-modal animate-scale-in">
          <div className="flex items-center gap-3">
            {/* Zara — English */}
            <button
              onClick={() => { setTtsLang('en'); setIsOpen(true); }}
              className="mascot-3d group flex flex-col items-center gap-1"
            >
              <div className="mascot-avatar mascot-glow-purple rounded-full p-0.5 border border-[#c39bff]/30 bg-[#c39bff]/10 group-hover:bg-[#c39bff]/25 transition-all">
                <ZaraMascot size={36} glow />
              </div>
              <span className="text-[9px] font-bold text-[#c39bff]/70 group-hover:text-[#c39bff] transition-colors">Zara</span>
            </button>

            {/* Kabir — Hindi */}
            <button
              onClick={() => { setTtsLang('hi'); setIsOpen(true); }}
              className="mascot-3d group flex flex-col items-center gap-1"
            >
              <div className="mascot-avatar mascot-glow-cyan rounded-full p-0.5 border border-[#a1faff]/30 bg-[#a1faff]/10 group-hover:bg-[#a1faff]/25 transition-all" style={{ animationDelay: '0.5s' }}>
                <KabirMascot size={36} glow />
              </div>
              <span className="text-[9px] font-bold text-[#a1faff]/70 group-hover:text-[#a1faff] transition-colors">Kabir</span>
            </button>
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

          <div className="fixed inset-0 md:inset-4 md:left-auto md:w-[520px] md:rounded-2xl z-modal flex flex-col overflow-hidden glass-card animate-scale-in">
            {/* ─── Header ─── */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#c39bff] to-[#a1faff]">
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
                <div className="flex items-center gap-1 shrink-0">
                  <ZaraMascot size={22} glow />
                  <KabirMascot size={22} glow />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-white text-sm leading-tight">
                    Zara & Kabir
                  </h3>
                  <p className="text-[10px] text-white/70 leading-tight">
                    Your voice assistants
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isSupported && (
                  <span className="text-[10px] text-yellow-200 px-1.5 py-0.5 rounded bg-white/10">No mic</span>
                )}
                {permissionDenied && isSupported && (
                  <span className="text-[10px] text-yellow-200 px-1.5 py-0.5 rounded bg-white/10">Mic blocked</span>
                )}
                {/* Voice settings toggle */}
                <button
                  onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                  className={`p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors ${showVoiceSettings ? 'text-[#a1faff] bg-white/10' : 'text-white/70'}`}
                  aria-label="Voice settings"
                  title="Change voice"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
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

            {/* ─── Voice Settings: Mascot Selector ─── */}
            {showVoiceSettings && (
              <div className="shrink-0 px-4 py-3 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-3 justify-center">
                  {/* Zara — English */}
                  <button
                    onClick={() => {
                      setTtsLang('en');
                      const match = voices.find(v => v.lang.startsWith('en'));
                      if (match) setSelectedVoiceURI(match.voiceURI);
                    }}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                      ttsLang === 'en'
                        ? 'bg-[#c39bff]/15 border border-[#c39bff]/30 shadow-[0_0_12px_rgba(195,155,255,0.2)]'
                        : 'bg-white/5 border border-white/5 opacity-50 hover:opacity-80'
                    }`}
                  >
                    <div className={`relative ${ttsLang === 'en' ? 'animate-pulse' : ''}`} style={{ animationDuration: '3s' }}>
                      <ZaraMascot size={32} glow={ttsLang === 'en'} />
                      {cloudTTSAvailable && ttsLang === 'en' && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#c39bff] shadow-[0_0_6px_rgba(195,155,255,0.8)]" />
                      )}
                    </div>
                    <span className={`text-[10px] font-bold tracking-wide ${ttsLang === 'en' ? 'text-[#c39bff]' : 'text-white/40'}`}>Zara</span>
                    <span className={`text-[8px] ${ttsLang === 'en' ? 'text-white/50' : 'text-white/20'}`}>English</span>
                  </button>

                  {/* Kabir — Hindi */}
                  <button
                    onClick={() => {
                      setTtsLang('hi');
                      const match = voices.find(v => v.lang.startsWith('hi'));
                      if (match) setSelectedVoiceURI(match.voiceURI);
                    }}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                      ttsLang === 'hi'
                        ? 'bg-[#a1faff]/15 border border-[#a1faff]/30 shadow-[0_0_12px_rgba(161,250,255,0.2)]'
                        : 'bg-white/5 border border-white/5 opacity-50 hover:opacity-80'
                    }`}
                  >
                    <div className={`relative ${ttsLang === 'hi' ? 'animate-pulse' : ''}`} style={{ animationDuration: '3s' }}>
                      <KabirMascot size={32} glow={ttsLang === 'hi'} />
                      {cloudTTSAvailable && ttsLang === 'hi' && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#a1faff] shadow-[0_0_6px_rgba(161,250,255,0.8)]" />
                      )}
                    </div>
                    <span className={`text-[10px] font-bold tracking-wide ${ttsLang === 'hi' ? 'text-[#a1faff]' : 'text-white/40'}`}>Kabir</span>
                    <span className={`text-[8px] ${ttsLang === 'hi' ? 'text-white/50' : 'text-white/20'}`}>Hindi</span>
                  </button>

                  {/* Test */}
                  <button
                    onClick={() => speakResponse(ttsLang === 'en' ? 'Hi, I\'m Zara! How can I help you today?' : 'Namaste, main Kabir hoon! Aapki kya madad kar sakta hoon?')}
                    className="text-[10px] text-white/40 hover:text-white transition-colors px-2 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 self-end"
                  >
                    Test
                  </button>
                </div>
              </div>
            )}

            {/* ─── Messages ─── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-hide">
              {messages.length === 0 && (
                <div className="space-y-4 pt-4">
                  {/* Welcome message as chat bubble */}
                  <div className="flex justify-start gap-2">
                    <div className="shrink-0 mt-1">
                      <ActiveMascot lang={ttsLang} size={20} />
                    </div>
                    <div className="max-w-[85%] space-y-3">
                      <div className="rounded-2xl px-4 py-3 glass-card text-white border border-white/10">
                        <p className="text-sm leading-relaxed">
                          {user
                            ? `Hey! I'm ${ttsLang === 'en' ? 'Zara' : 'Kabir'}. I can help you find artists, check bookings, manage your calendar, and more. What do you need?`
                            : `Hey! I'm ${ttsLang === 'en' ? 'Zara' : 'Kabir'}, your AI assistant for finding the perfect artist. Tell me about your event and I'll find the best match — DJs, singers, bands, comedians, and more across India.`}
                        </p>
                      </div>
                      {/* Quick action chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {(user ? authChips : guestChips).map((q) => (
                          <button
                            key={q}
                            onClick={() => sendQueryCb(q)}
                            className="text-xs bg-[#c39bff]/20 text-[#c39bff] hover:bg-[#c39bff]/30 rounded-full px-3 py-1.5 transition-all border border-[#c39bff]/30"
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
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${msg.role === 'assistant' ? 'gap-2' : ''}`}>
                  {/* Mascot avatar for assistant messages */}
                  {msg.role === 'assistant' && (
                    <div className="shrink-0 mt-1">
                      <ActiveMascot lang={ttsLang} size={20} />
                    </div>
                  )}
                  <div className={`max-w-[85%] space-y-2`}>
                    {/* Message bubble */}
                    <div
                      className={`rounded-2xl px-4 py-2.5 ${
                        msg.role === 'user'
                          ? 'bg-[#c39bff] text-white'
                          : 'glass-card rounded-2xl text-white border border-white/10'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>
                    </div>

                    {/* ─── Rich Visual Cards (new) ─── */}
                    {msg.cards && msg.cards.length > 0 && (
                      <CardRenderer
                        cards={msg.cards}
                        onSelectArtist={(id) => handleSuggestionClick(`Tell me more about artist ${id}`)}
                      />
                    )}

                    {/* ─── Legacy Artist Cards (fallback) ─── */}
                    {!msg.cards && msg.artists && msg.artists.length > 0 && (
                      <div className="-mx-4">
                        <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory">
                          {msg.artists.map((artist) => (
                            <MiniArtistCard key={artist.id} {...artist} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ─── Follow-up Prompt ─── */}
                    {msg.follow_up && (
                      <div className="rounded-xl border border-[#c39bff]/20 bg-[#c39bff]/5 px-3 py-2.5 space-y-2">
                        <p className="text-xs text-white/60">{msg.follow_up.question}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.follow_up.options.map((opt, j) => (
                            <button
                              key={j}
                              onClick={() => handleSuggestionClick(opt)}
                              className="text-xs bg-[#c39bff]/15 text-[#c39bff] hover:bg-[#c39bff]/25 rounded-full px-2.5 py-1 transition-all border border-[#c39bff]/25 font-medium"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Navigation action card */}
                    {msg.action?.type === 'navigate' && msg.action.route && (
                      <button
                        onClick={() => handleNavigateAction(msg.action!.route!)}
                        className="flex items-center gap-2 w-full text-left text-xs badge-nocturne rounded-lg px-3 py-2 transition-all"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                        Go to page
                      </button>
                    )}

                    {/* Suggestion chips */}
                    {msg.suggestions && msg.suggestions.length > 0 && !msg.follow_up && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.suggestions.map((s, j) => (
                          <button
                            key={j}
                            onClick={() => handleSuggestionClick(s)}
                            className="text-xs bg-[#c39bff]/20 text-[#c39bff] hover:bg-[#c39bff]/30 rounded-full px-2.5 py-1 transition-all border border-[#c39bff]/30"
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
              <div className="shrink-0 px-4 py-2 text-center border-t border-white/10 bg-white/5">
                <VoiceWaveform isActive={true} />
                {interimTranscript && (
                  <p className="text-xs text-white/50 italic mt-1">{interimTranscript}</p>
                )}
                <p className="text-xs text-[#c39bff] mt-1">Listening...</p>
              </div>
            )}
            {state === 'processing' && (
              <div className="shrink-0 px-4 py-2 text-center border-t border-white/10 bg-white/5">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c39bff] animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a1faff] animate-pulse [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffbf00] animate-pulse [animation-delay:0.4s]" />
                </div>
                <p className="text-xs text-white/50 mt-1">Thinking...</p>
              </div>
            )}
            {state === 'responding' && (
              <div className="shrink-0 px-4 py-2 border-t border-white/10 bg-white/5 flex items-center justify-center gap-2">
                <div className="animate-pulse" style={{ animationDuration: '1.5s' }}>
                  <ActiveMascot lang={ttsLang} size={22} />
                </div>
                <p className={`text-xs font-medium ${ttsLang === 'en' ? 'text-[#c39bff]' : 'text-[#a1faff]'}`}>
                  {ttsLang === 'en' ? 'Zara' : 'Kabir'} is speaking...
                </p>
              </div>
            )}

            {/* ─── Input Area ─── */}
            <div className="shrink-0 px-3 py-3 border-t border-white/10 bg-white/5 backdrop-blur-3xl flex items-center gap-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
              {/* Mic button */}
              <button
                onClick={handleMicClick}
                disabled={!isSupported || state === 'processing' || state === 'responding'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  state === 'listening'
                    ? 'bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                    : 'glass-card text-white hover:bg-white/10'
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
                  placeholder="Ask anything — search, navigate, book..."
                  className="input-nocturne flex-1 rounded-full px-4 py-2 text-sm"
                  disabled={state !== 'idle'}
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || state !== 'idle'}
                  className="text-[#c39bff] hover:text-[#a1faff] font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
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
