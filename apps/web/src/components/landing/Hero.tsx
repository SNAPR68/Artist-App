'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, Mic, Send } from 'lucide-react';
import { CardRenderer } from '../voice/cards/CardRenderer';
import { useVoiceRecognition } from '../voice/useVoiceRecognition';
import { apiClient } from '../../lib/api-client';
import type { VoiceCard, ClarifyingQuestion } from '@artist-booking/shared';

// ─── Example briefs for placeholder rotation ────────────────
const EXAMPLE_BRIEFS = [
  'Delhi wedding, 300 guests, Punjabi singer for sangeet night, 5L budget',
  'Mumbai corporate annual day, 1000 pax, high-energy host + band',
  'Bangalore house party, 50 people, acoustic singer, under 50k',
  'Goa beach wedding, live DJ + dhol player, sunset ceremony',
  'Hyderabad college fest, rapper + beatboxer, 2L budget',
];

// ─── Conversation message types ─────────────────────────────
interface ConvoMessage {
  role: 'user' | 'assistant';
  text: string;
  cards?: VoiceCard[];
  clarifying_questions?: ClarifyingQuestion[];
  parsed_context?: Record<string, unknown>;
  follow_up?: { question: string; options: string[] };
  response_type?: string;
}

export function Hero() {
  const router = useRouter();
  const containerRef = useRef(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [briefText, setBriefText] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<ConvoMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const { isListening, transcript, interimTranscript, isSupported: micSupported, startListening, stopListening, resetTranscript } = useVoiceRecognition();

  useEffect(() => { setMounted(true); const t = setTimeout(() => setHeroVisible(true), 80); return () => clearTimeout(t); }, []);
  useEffect(() => { const t = setInterval(() => setActiveSlide(p => (p + 1) % 4), 5000); return () => clearInterval(t); }, []);

  const lastTranscriptRef = useRef('');

  // Rotate placeholder examples
  useEffect(() => {
    if (briefText || messages.length > 0) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % EXAMPLE_BRIEFS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [briefText, messages.length]);

  const speakText = useCallback((text: string) => {
    fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, lang: 'en', stream: true }) })
      .then(async (res) => {
        if (!res.ok) throw new Error('tts unavailable');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        audio.play().catch(() => {});
      })
      .catch(() => {
        // ElevenLabs not configured — fall back to browser speech synthesis
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text.slice(0, 300));
        utt.rate = 1.05;
        utt.pitch = 1.1;
        // Prefer a female voice if available
        const voices = window.speechSynthesis.getVoices();
        const female = voices.find((v) => /female|woman|zira|samantha|karen|victoria/i.test(v.name));
        if (female) utt.voice = female;
        window.speechSynthesis.speak(utt);
      });
  }, []);

  // ─── Send message — AI-powered when flag enabled, decision-engine fallback ──
  const AI_ENABLED = process.env.NEXT_PUBLIC_CHAT_AI_ENABLED === 'true';

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setBriefText('');
    setMessages((prev) => [...prev, { role: 'user', text }]);

    // ═══════════════════════════════════════════════════════════
    // AI PATH — POST to /api/chat and stream SSE
    // ═══════════════════════════════════════════════════════════
    if (AI_ENABLED) {
      try {
        const history = [...messages, { role: 'user' as const, text }].map((m) => ({
          role: m.role,
          content: m.text,
        }));

        let assistantIndex = 0;
        setMessages((prev) => {
          assistantIndex = prev.length;
          return [...prev, { role: 'assistant', text: '' }];
        });

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, sessionId, surface: 'hero' }),
        });

        if (!res.ok || !res.body) throw new Error(`chat ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamedText = '';

        let streamDone = false;
        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) { streamDone = true; break; }
          buffer += decoder.decode(value, { stream: true });

          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            const eventMatch = frame.match(/^event: (\w+)$/m);
            const dataMatch = frame.match(/^data: (.+)$/m);
            if (!eventMatch || !dataMatch) continue;

            const event = eventMatch[1];
            let data: unknown;
            try { data = JSON.parse(dataMatch[1]); } catch { continue; }

            if (event === 'text') {
              const delta = (data as { delta?: string }).delta ?? '';
              streamedText += delta;
              const currentText = streamedText;
              setMessages((prev) => {
                const next = [...prev];
                if (next[assistantIndex]) next[assistantIndex] = { ...next[assistantIndex], text: currentText };
                return next;
              });
            } else if (event === 'done') {
              const final = data as {
                text?: string; cards?: VoiceCard[];
                follow_up?: { question: string; options: string[] };
                suggestions?: string[]; action?: { type: string; route?: string }; sessionId?: string;
              };
              if (final.sessionId) setSessionId(final.sessionId);
              setMessages((prev) => {
                const next = [...prev];
                if (next[assistantIndex]) next[assistantIndex] = { ...next[assistantIndex], text: final.text ?? streamedText, cards: final.cards, follow_up: final.follow_up };
                return next;
              });
              if (final.text) speakText(final.text);
              if (final.action?.type === 'navigate' && final.action.route) setTimeout(() => router.push(final.action!.route!), 800);
            }
          }
        }
      } catch {
        setMessages((prev) => [...prev, { role: 'assistant', text: "Something hiccupped. Mind trying again?", follow_up: { question: 'What would you like to do?', options: ['Try again', 'Browse artists'] } }]);
      }

      setIsSubmitting(false);
      setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 300);
      return;
    }

    // ═══════════════════════════════════════════════════════════
    // LEGACY PATH — decision engine
    // ═══════════════════════════════════════════════════════════
    try {
      const body: Record<string, unknown> = { raw_text: text, source: 'web' };
      if (sessionId) body.session_id = sessionId;

      const res = await apiClient<{
        session_id: string;
        response_type: 'clarifying_questions' | 'recommendations';
        response_text: string;
        clarifying_questions?: ClarifyingQuestion[];
        parsed_context?: Record<string, unknown>;
        recommendations?: Array<{
          artist_id: string; artist_name?: string; artist_type?: string; profile_image?: string | null;
          score?: number; confidence?: number; rank?: number; price_min_paise?: number; price_max_paise?: number;
          expected_close_paise?: number; why_fit?: string[]; risk_flags?: string[]; logistics_flags?: string[];
        }>;
      }>('/v1/decision-engine/brief', { method: 'POST', body: JSON.stringify(body) });

      if (res.success && res.data) {
        const data = res.data;
        setSessionId(data.session_id);

        if (data.response_type === 'clarifying_questions') {
          setMessages((prev) => [...prev, { role: 'assistant', text: data.response_text, response_type: 'clarifying_questions', clarifying_questions: data.clarifying_questions, parsed_context: data.parsed_context }]);
          speakText(data.response_text);
        } else if (data.response_type === 'recommendations') {
          const recs = data.recommendations || [];
          const cards: VoiceCard[] = recs.map((rec) => ({
            type: 'artist_recommendation' as const,
            data: {
              id: rec.artist_id, stage_name: rec.artist_name || 'Artist', artist_type: rec.artist_type,
              thumbnail_url: rec.profile_image ?? null, score: rec.score, confidence: rec.confidence, rank: rec.rank,
              price_min_paise: rec.price_min_paise, price_max_paise: rec.price_max_paise, expected_close_paise: rec.expected_close_paise,
              why_fit: rec.why_fit || [], risk_flags: rec.risk_flags || [], logistics_flags: rec.logistics_flags || [],
            },
          }));
          setMessages((prev) => [...prev, {
            role: 'assistant', text: data.response_text, cards: cards.length > 0 ? cards : undefined,
            response_type: 'recommendations',
            follow_up: recs.length > 0 ? { question: 'Want a proposal for any of these?', options: ['Yes, send proposal', 'Show more details'] } : { question: 'What would you like to do?', options: ['Try again', 'Broaden search'] },
          }]);
          speakText(data.response_text);
        }
      } else { throw new Error('API error'); }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry, something went wrong. Please try again.', follow_up: { question: 'What would you like to do?', options: ['Try again', 'Browse artists'] } }]);
    }

    setIsSubmitting(false);
    setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 300);
  }, [isSubmitting, sessionId, speakText, AI_ENABLED, messages, router]);

  // Auto-submit when voice transcript is finalized
  useEffect(() => {
    if (transcript && transcript !== lastTranscriptRef.current && !isListening) {
      lastTranscriptRef.current = transcript;
      sendMessage(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, resetTranscript, sendMessage]);

  const handleSubmit = useCallback(() => { sendMessage(briefText.trim()); }, [briefText, sendMessage]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }, [handleSubmit]);
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => { setBriefText(e.target.value); }, []);
  const handleChipClick = useCallback((value: string) => { sendMessage(value); }, [sendMessage]);

  const hasConversation = messages.length > 0;

  // ─── Expanded inline chat (conversation mode) ───────────────
  const InlineChatBox = hasConversation ? (
    <div
      className="w-full rounded-2xl border border-white/[0.14] bg-black/65 backdrop-blur-2xl overflow-hidden flex flex-col shadow-[0_0_60px_-10px_rgba(195,155,255,0.18),0_32px_64px_-16px_rgba(0,0,0,0.7)]"
      style={{ height: '620px' }}
    >
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.025]">
        <div className="flex items-center gap-3">
          {/* Zara avatar */}
          <div className="relative w-9 h-9 shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c39bff]/30 to-[#8A2BE2]/20 flex items-center justify-center border border-[#c39bff]/25 shadow-[0_0_16px_rgba(195,155,255,0.25)]">
              <span className="text-sm font-bold text-[#c39bff]">Z</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Zara</span>
              <span className="text-[10px] text-[#a1faff]/60 px-1.5 py-0.5 rounded bg-[#a1faff]/10 font-medium tracking-wide uppercase">GRID AI</span>
            </div>
            <p className="text-[11px] text-white/30 mt-0.5">Your event intelligence assistant</p>
          </div>
        </div>
        <button
          onClick={() => { setMessages([]); setSessionId(null); }}
          className="text-xs text-white/30 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
        >
          New chat
        </button>
      </div>

      {/* Messages (scrollable) */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-hide">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2.5'}`}
            style={{ animation: `heroMsgIn 0.35s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s both` }}
          >
            {msg.role === 'assistant' && (
              <div className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-gradient-to-br from-[#c39bff]/25 to-[#8A2BE2]/15 flex items-center justify-center border border-[#c39bff]/20">
                <span className="text-[10px] font-bold text-[#c39bff]">Z</span>
              </div>
            )}
            <div className="max-w-[85%] space-y-2.5">
              <div className={`rounded-xl px-4 py-2.5 ${msg.role === 'user'
                ? 'bg-gradient-to-br from-[#c39bff] to-[#a47fe8] text-white shadow-[0_4px_20px_rgba(195,155,255,0.25)]'
                : 'bg-white/[0.07] border border-white/[0.09] text-white'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>
              </div>

              {msg.parsed_context && Object.keys(msg.parsed_context).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(msg.parsed_context).map(([key, val]) => (
                    <span key={key} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/[0.07]">{key}: {String(val)}</span>
                  ))}
                </div>
              )}

              {msg.clarifying_questions && msg.clarifying_questions.length > 0 && (
                <div className="space-y-2">
                  {msg.clarifying_questions.map((q, qi) => (
                    <div key={qi}>
                      <p className="text-xs text-white/50 mb-1.5">{q.question}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {q.options.map((opt) => (
                          <button key={String(opt.value)} onClick={() => handleChipClick(String(opt.value === 'skip' ? 'skip' : opt.label))}
                            className="text-xs bg-white/5 text-white/60 hover:bg-[#c39bff]/15 hover:text-[#c39bff] rounded-full px-3 py-1 transition-all duration-150 border border-white/10 hover:border-[#c39bff]/30 font-medium hover:scale-[1.02] active:scale-[0.98]">
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {msg.cards && msg.cards.length > 0 && <CardRenderer cards={msg.cards} />}

              {msg.follow_up && !msg.clarifying_questions && (
                <div className="rounded-xl border border-[#c39bff]/20 bg-[#c39bff]/[0.06] px-4 py-3 space-y-2">
                  <p className="text-xs text-white/50">{msg.follow_up.question}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.follow_up.options.map((opt, j) => (
                      <button key={j} onClick={() => handleChipClick(opt)}
                        className="text-xs bg-[#c39bff]/15 text-[#c39bff] hover:bg-[#c39bff]/25 rounded-full px-3 py-1.5 transition-all duration-150 border border-[#c39bff]/25 font-medium hover:scale-[1.02] active:scale-[0.98]">
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isSubmitting && (
          <div className="flex justify-start gap-2.5" style={{ animation: 'heroMsgIn 0.35s cubic-bezier(0.16,1,0.3,1) both' }}>
            <div className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-gradient-to-br from-[#c39bff]/25 to-[#8A2BE2]/15 flex items-center justify-center border border-[#c39bff]/20">
              <span className="text-[10px] font-bold text-[#c39bff]">Z</span>
            </div>
            <div className="bg-white/[0.07] border border-white/[0.09] rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c39bff]/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c39bff]/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c39bff]/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-white/30">Zara is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ─── Listening indicator ─── */}
      {isListening && (
        <div className="shrink-0 px-4 py-2 text-center border-t border-white/[0.08] bg-[#c39bff]/[0.04]">
          {interimTranscript && <p className="text-xs text-white/40 italic truncate">{interimTranscript}</p>}
          <p className="text-xs text-[#c39bff] font-medium">Listening...</p>
        </div>
      )}

      {/* ─── Input bar ─── */}
      <div className="shrink-0 border-t border-white/[0.08] bg-white/[0.025] px-5 py-4">
        <div className="flex items-end gap-3">
          <button
            onClick={() => { if (!mounted || !micSupported) return; if (isListening) { stopListening(); } else { startListening(); } }}
            className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 mb-0.5 ${isListening
              ? 'bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]'
              : 'bg-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/10 border border-white/10 hover:scale-105 active:scale-95'
            }`}
            title={isListening ? 'Stop' : 'Voice input'}
          >
            <Mic size={17} />
          </button>
          <div className="flex-1 flex flex-col gap-0 rounded-2xl bg-white/[0.06] border border-white/[0.09] focus-within:border-[#c39bff]/40 focus-within:shadow-[0_0_0_3px_rgba(195,155,255,0.07)] transition-all duration-200 overflow-hidden">
            <textarea
              ref={chatInputRef as unknown as React.RefObject<HTMLTextAreaElement>}
              value={briefText}
              onChange={(e) => setBriefText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Reply to Zara..."
              rows={2}
              className="w-full bg-transparent text-white placeholder:text-white/25 text-sm px-4 pt-3 pb-1 focus:outline-none resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
              <span className="text-[10px] text-white/20">Shift+Enter for new line</span>
              <button
                onClick={handleSubmit}
                disabled={!briefText.trim() || isSubmitting}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${briefText.trim()
                  ? 'bg-[#c39bff] text-black hover:bg-[#b48af0] hover:scale-[1.03] active:scale-[0.97]'
                  : 'bg-white/5 text-white/15 cursor-not-allowed'
                }`}
              >
                <Send size={12} /> Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // ═══════════════════════════════════════════════════════════
  // HERO — background images + headline + chat box
  // ═══════════════════════════════════════════════════════════
  return (
    <section ref={containerRef} className="relative min-h-screen flex flex-col overflow-hidden bg-[#0a0a0a]">

      {/* ─── Ambient glows (floating, pulsing) ─── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-[#c39bff]/[0.07] blur-[120px]" style={{ animation: 'glowPulse 8s ease-in-out infinite' }} />
        <div className="absolute top-1/3 right-1/5 w-[400px] h-[400px] rounded-full bg-[#a1faff]/[0.05] blur-[100px]" style={{ animation: 'glowPulse 10s ease-in-out infinite 2s' }} />
      </div>

      {/* ─── Rotating Background Images ─── */}
      <div className="absolute inset-0 z-0">
        {[
          'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&q=80&fit=crop',
          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1920&q=80&fit=crop',
          'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1920&q=80&fit=crop',
          'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=1920&q=80&fit=crop',
        ].map((url, i) => (
          <div key={url} className={`absolute inset-0 transition-opacity duration-[2000ms] ${i === activeSlide ? 'opacity-40' : 'opacity-0'}`}>
            <Image src={url} alt="" fill sizes="100vw" className="object-cover" priority={i === 0} />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/95 via-[#0a0a0a]/80 to-transparent z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/40 z-[1]" />

      {/* ─── Main Content ─── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-[920px] flex flex-col items-center gap-8">

          {/* ── Headline — staggered entrance ── */}
          <div
            className="text-center transition-all duration-700 ease-out"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(28px)',
            }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-[68px] font-light leading-[1.08] tracking-[-2.5px] text-white mb-4">
              Run your event
              <span className="text-white/45"> business on </span>
              <span className="font-semibold text-white">GRID</span>
            </h1>
            <p
              className="text-base md:text-lg text-[#b8b8b8] max-w-lg mx-auto transition-all duration-700 delay-150 ease-out"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateY(0)' : 'translateY(16px)',
              }}
            >
              Brief → Recommendation → Proposal → Booking — all in one place.
            </p>
          </div>

          {/* ─── Chat box — the centerpiece ─── */}
          <div
            className="w-full transition-all duration-700 delay-200 ease-out"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.98)',
            }}
          >
            {hasConversation ? InlineChatBox : (
              <div className="w-full rounded-2xl border border-white/[0.14] bg-black/65 backdrop-blur-2xl overflow-hidden shadow-[0_0_60px_-10px_rgba(195,155,255,0.15),0_32px_64px_-16px_rgba(0,0,0,0.65)] transition-all duration-300 hover:border-white/[0.2] hover:shadow-[0_0_80px_-10px_rgba(195,155,255,0.22),0_40px_80px_-20px_rgba(0,0,0,0.7)]">
                {/* Zara label */}
                <div className="px-6 pt-5 pb-3 flex items-center gap-3">
                  {/* Zara avatar with online dot */}
                  <div className="relative w-8 h-8 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c39bff]/30 to-[#8A2BE2]/20 flex items-center justify-center border border-[#c39bff]/25 shadow-[0_0_12px_rgba(195,155,255,0.2)]">
                      <span className="text-xs font-bold text-[#c39bff]">Z</span>
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black" style={{ animation: 'subtlePulse 2.5s ease-in-out infinite' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">Zara</span>
                      <span className="text-[10px] text-[#a1faff]/60 px-1.5 py-0.5 rounded bg-[#a1faff]/10 font-medium tracking-wide uppercase">GRID AI</span>
                    </div>
                    <p className="text-[11px] text-white/30">Ask me anything about your event</p>
                  </div>
                </div>

                {/* Textarea — generous height */}
                <div className="relative px-6 pb-3">
                  {isListening && interimTranscript && (
                    <div className="absolute top-0 left-9 right-9 text-white/30 text-base italic pointer-events-none truncate">
                      {interimTranscript}
                    </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    value={briefText}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    aria-label="Describe your event"
                    placeholder={EXAMPLE_BRIEFS[placeholderIndex]}
                    rows={5}
                    className="w-full bg-transparent text-white placeholder:text-white/22 text-base resize-none focus:outline-none leading-relaxed py-2"
                    style={{ minHeight: '140px', maxHeight: '260px' }}
                  />
                </div>

                {/* Subtle inner separator */}
                <div className="mx-6 h-px bg-white/[0.06]" />

                {/* Input bar */}
                <div className="px-5 py-4 flex items-center justify-between">
                  <button
                    onClick={() => { if (!mounted || !micSupported) return; if (isListening) { stopListening(); } else { startListening(); } }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${isListening
                      ? 'bg-red-500/20 text-red-400 animate-pulse'
                      : 'text-white/35 hover:text-white/65 hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    <Mic size={16} />
                    <span>{isListening ? 'Listening...' : 'Voice'}</span>
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!briefText.trim() || isSubmitting}
                    className={`flex items-center gap-2 py-2.5 px-6 rounded-xl text-sm font-semibold transition-all duration-200 ${briefText.trim()
                      ? 'bg-gradient-to-r from-[#c39bff] to-[#a47fe8] text-black hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_20px_rgba(195,155,255,0.3)]'
                      : 'bg-white/5 text-white/20 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting
                      ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      : <><span>Get Recommendations</span><ArrowRight size={15} /></>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Suggestion chips ── */}
          {!hasConversation && (
            <div
              className="flex flex-wrap justify-center gap-2 transition-all duration-700 delay-300 ease-out"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateY(0)' : 'translateY(16px)',
              }}
            >
              {['Wedding sangeet in Delhi', 'Corporate event Mumbai', 'College fest band'].map((ex, i) => (
                <button
                  key={ex}
                  onClick={() => { setBriefText(ex); textareaRef.current?.focus(); }}
                  className="px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.09] text-white/40 hover:text-white/70 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200 text-xs hover:scale-[1.03] active:scale-[0.97]"
                  style={{ transitionDelay: `${i * 50}ms` }}
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          {/* ── CTA + stats row ── */}
          {!hasConversation && (
            <div
              className="flex items-center justify-between w-full pt-1 transition-all duration-700 delay-[400ms] ease-out"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateY(0)' : 'translateY(16px)',
              }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => router.push('/brief')}
                  className="flex items-center gap-2 bg-[#c39bff] text-black py-3 px-6 rounded-xl text-sm font-semibold hover:bg-[#b48af0] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-[0_4px_24px_rgba(195,155,255,0.35)]"
                >
                  Hire an Artist <ArrowRight size={15} />
                </button>
                <button
                  onClick={() => router.push('/agency/join')}
                  className="flex items-center gap-2 border border-white/[0.14] bg-white/[0.04] text-white py-3 px-5 rounded-xl text-sm font-medium hover:bg-white/[0.08] hover:border-[#c39bff]/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                >
                  Event Company OS <span className="text-[10px] text-white/35">· CRM</span>
                </button>
                <button
                  onClick={() => router.push('/artist/onboarding')}
                  className="text-[#b8b8b8] text-sm font-medium hover:text-white transition-all duration-200 px-3 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Join as Artist
                </button>
              </div>
              <div className="hidden md:flex gap-10 items-center">
                <div className="text-center">
                  <div className="text-3xl font-light text-white tabular-nums">5K+</div>
                  <div className="text-xs text-white/35 mt-0.5">Verified artists</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-light text-white tabular-nums">30+</div>
                  <div className="text-xs text-white/35 mt-0.5">Indian cities</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Keyframes ─── */}
      <style jsx>{`
        @keyframes heroMsgIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes subtlePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.5); }
          50% { box-shadow: 0 0 0 4px rgba(52, 211, 153, 0); }
        }
      `}</style>
    </section>
  );
}
