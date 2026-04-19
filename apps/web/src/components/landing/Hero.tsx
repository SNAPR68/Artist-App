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
  const { isListening, transcript, interimTranscript, isSupported: micSupported, startListening, stopListening, resetTranscript } = useVoiceRecognition();

  useEffect(() => { setMounted(true); }, []);
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
      .then(async (res) => { if (!res.ok) return; const blob = await res.blob(); const url = URL.createObjectURL(blob); const audio = new Audio(url); audio.onended = () => URL.revokeObjectURL(url); audio.play().catch(() => {}); })
      .catch(() => {});
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
        // Build conversation history from current messages + new user turn
        const history = [...messages, { role: 'user' as const, text }].map((m) => ({
          role: m.role,
          content: m.text,
        }));

        // Insert an empty assistant message we'll mutate as chunks arrive
        let assistantIndex = 0;
        setMessages((prev) => {
          assistantIndex = prev.length;
          return [...prev, { role: 'assistant', text: '' }];
        });

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history,
            sessionId,
            surface: 'hero',
          }),
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

          // Parse SSE frames: event: X\ndata: Y\n\n
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            const eventMatch = frame.match(/^event: (\w+)$/m);
            const dataMatch = frame.match(/^data: (.+)$/m);
            if (!eventMatch || !dataMatch) continue;

            const event = eventMatch[1];
            let data: unknown;
            try {
              data = JSON.parse(dataMatch[1]);
            } catch {
              continue;
            }

            if (event === 'text') {
              const delta = (data as { delta?: string }).delta ?? '';
              streamedText += delta;
              const currentText = streamedText;
              setMessages((prev) => {
                const next = [...prev];
                if (next[assistantIndex]) {
                  next[assistantIndex] = { ...next[assistantIndex], text: currentText };
                }
                return next;
              });
            } else if (event === 'done') {
              const final = data as {
                text?: string;
                cards?: VoiceCard[];
                follow_up?: { question: string; options: string[] };
                suggestions?: string[];
                action?: { type: string; route?: string };
                sessionId?: string;
              };
              if (final.sessionId) setSessionId(final.sessionId);
              setMessages((prev) => {
                const next = [...prev];
                if (next[assistantIndex]) {
                  next[assistantIndex] = {
                    ...next[assistantIndex],
                    text: final.text ?? streamedText,
                    cards: final.cards,
                    follow_up: final.follow_up,
                  };
                }
                return next;
              });
              if (final.text) speakText(final.text);
              // Handle navigation action if present
              if (final.action?.type === 'navigate' && final.action.route) {
                setTimeout(() => router.push(final.action!.route!), 800);
              }
            }
          }
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: "Something hiccupped. Mind trying again?",
            follow_up: { question: 'What would you like to do?', options: ['Try again', 'Browse artists'] },
          },
        ]);
      }

      setIsSubmitting(false);
      setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 300);
      return;
    }

    // ═══════════════════════════════════════════════════════════
    // LEGACY PATH — decision engine (zero-regression when flag off)
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
          artist_id: string;
          artist_name?: string;
          artist_type?: string;
          profile_image?: string | null;
          score?: number;
          confidence?: number;
          rank?: number;
          price_min_paise?: number;
          price_max_paise?: number;
          expected_close_paise?: number;
          why_fit?: string[];
          risk_flags?: string[];
          logistics_flags?: string[];
        }>;
      }>('/v1/decision-engine/brief', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.success && res.data) {
        const data = res.data;
        setSessionId(data.session_id);

        if (data.response_type === 'clarifying_questions') {
          setMessages((prev) => [...prev, {
            role: 'assistant', text: data.response_text,
            response_type: 'clarifying_questions',
            clarifying_questions: data.clarifying_questions,
            parsed_context: data.parsed_context,
          }]);
          speakText(data.response_text);
        } else if (data.response_type === 'recommendations') {
          const recs = data.recommendations || [];
          const cards: VoiceCard[] = recs.map((rec) => ({
            type: 'artist_recommendation' as const,
            data: {
              id: rec.artist_id, stage_name: rec.artist_name || 'Artist',
              artist_type: rec.artist_type, thumbnail_url: rec.profile_image ?? null,
              score: rec.score, confidence: rec.confidence, rank: rec.rank,
              price_min_paise: rec.price_min_paise, price_max_paise: rec.price_max_paise,
              expected_close_paise: rec.expected_close_paise,
              why_fit: rec.why_fit || [], risk_flags: rec.risk_flags || [],
              logistics_flags: rec.logistics_flags || [],
            },
          }));
          setMessages((prev) => [...prev, {
            role: 'assistant', text: data.response_text,
            cards: cards.length > 0 ? cards : undefined,
            response_type: 'recommendations',
            follow_up: recs.length > 0
              ? { question: 'Want a proposal for any of these?', options: ['Yes, send proposal', 'Show more details'] }
              : { question: 'What would you like to do?', options: ['Try again', 'Broaden search'] },
          }]);
          speakText(data.response_text);
        }
      } else {
        throw new Error('API error');
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant', text: 'Sorry, something went wrong. Please try again.',
        follow_up: { question: 'What would you like to do?', options: ['Try again', 'Browse artists'] },
      }]);
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

  // ═══════════════════════════════════════════════════════════
  // HERO MODE — always shown; chat box replaces textarea inline
  // ═══════════════════════════════════════════════════════════
  {/* NOTE: no early return — chat stays inside the hero */}

  // Inline chat widget (rendered below instead of full-screen takeover)
  const InlineChatBox = hasConversation ? (
    <div className="w-full rounded-2xl border border-white/[0.12] bg-black/60 backdrop-blur-xl overflow-hidden flex flex-col" style={{ height: '560px' }}>
      {/* Header */}
      <div className="shrink-0 px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#c39bff]/20 flex items-center justify-center">
            <span className="text-xs font-bold text-[#c39bff]">Z</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-white">Zara</span>
            <span className="text-xs text-white/30 ml-2">GRID AI</span>
          </div>
        </div>
        <button
          onClick={() => { setMessages([]); setSessionId(null); }}
          className="text-xs text-white/30 hover:text-white/60 transition-colors px-3 py-1.5 rounded-md hover:bg-white/5"
        >
          New chat
        </button>
      </div>

      {/* Messages (scrollable) */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 scrollbar-hide">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2'}`}
            style={{ animation: `fadeIn 0.3s ease-out ${i * 0.05}s both` }}
          >
            {msg.role === 'assistant' && (
              <div className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-[#c39bff]/20 flex items-center justify-center">
                <span className="text-[9px] font-bold text-[#c39bff]">Z</span>
              </div>
            )}
            <div className="max-w-[85%] space-y-2">
              <div className={`rounded-xl px-3 py-2 ${msg.role === 'user' ? 'bg-[#c39bff] text-white' : 'bg-white/[0.08] border border-white/10 text-white'}`}>
                <p className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>
              </div>

              {msg.parsed_context && Object.keys(msg.parsed_context).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(msg.parsed_context).map(([key, val]) => (
                    <span key={key} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/8">{key}: {String(val)}</span>
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
                                className="text-xs bg-white/5 text-white/60 hover:bg-[#c39bff]/15 hover:text-[#c39bff] rounded-full px-2.5 py-1 transition-all border border-white/10 hover:border-[#c39bff]/30 font-medium">
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
                    <div className="rounded-lg border border-[#c39bff]/20 bg-[#c39bff]/5 px-3 py-2 space-y-1.5">
                      <p className="text-xs text-white/50">{msg.follow_up.question}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.follow_up.options.map((opt, j) => (
                          <button key={j} onClick={() => handleChipClick(opt)}
                            className="text-xs bg-[#c39bff]/15 text-[#c39bff] hover:bg-[#c39bff]/25 rounded-full px-2.5 py-1 transition-all border border-[#c39bff]/25 font-medium">
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
          <div className="flex justify-start gap-2" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-[#c39bff]/20 flex items-center justify-center">
              <span className="text-[9px] font-bold text-[#c39bff]">Z</span>
            </div>
            <div className="bg-white/[0.08] border border-white/10 rounded-xl px-3 py-2">
              <div className="flex items-center gap-1.5">
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
        <div className="shrink-0 px-3 py-1.5 text-center border-t border-white/10 bg-white/5">
          {interimTranscript && <p className="text-xs text-white/40 italic truncate">{interimTranscript}</p>}
          <p className="text-xs text-[#c39bff]">Listening...</p>
        </div>
      )}

      {/* ─── Input bar (pinned to bottom of chat box) ─── */}
      <div className="shrink-0 border-t border-white/10 bg-white/[0.03] px-5 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { if (!mounted || !micSupported) return; if (isListening) { stopListening(); } else { startListening(); } }}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-[0_0_16px_rgba(239,68,68,0.5)]' : 'bg-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/10 border border-white/10'}`}
            title={isListening ? 'Stop' : 'Voice input'}
          >
            <Mic size={17} />
          </button>
          <div className="flex-1 flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/10 focus-within:border-[#c39bff]/50 transition-all px-4">
            <input
              ref={chatInputRef}
              type="text"
              value={briefText}
              onChange={(e) => setBriefText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
              placeholder="Reply to Zara..."
              className="flex-1 bg-transparent text-white placeholder:text-white/25 text-sm py-3 focus:outline-none"
            />
            <button
              onClick={handleSubmit}
              disabled={!briefText.trim() || isSubmitting}
              className="text-[#c39bff] hover:text-[#b48af0] disabled:text-white/10 transition-colors shrink-0"
            >
              <Send size={17} />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  ) : null;

  // ═══════════════════════════════════════════════════════════
  // HERO — background images + headline + inline chat or textarea
  // ═══════════════════════════════════════════════════════════
  return (
    <section ref={containerRef} className="relative min-h-screen flex flex-col overflow-hidden bg-[#0a0a0a]">

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

      {/* ─── Main Content — always centered ─── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-[860px] flex flex-col items-center gap-8">

          {/* Headline */}
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-[64px] font-light leading-[1.1] tracking-[-2px] text-white mb-4">
              Run your event
              <span className="text-white/50"> business on </span>
              <span className="font-medium text-white">GRID</span>
            </h1>
            <p className="text-base md:text-lg text-[#b8b8b8] max-w-lg mx-auto">
              Brief → Recommendation → Proposal → Booking — all in one place.
            </p>
          </div>

          {/* ─── Chat box — always visible, messages appear inside ─── */}
          {hasConversation ? InlineChatBox : (
            <div className="w-full rounded-2xl border border-white/[0.12] bg-black/60 backdrop-blur-xl overflow-hidden">
              {/* Zara label */}
              <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#c39bff]/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-[#c39bff]">Z</span>
                </div>
                <span className="text-sm font-semibold text-white">Zara</span>
                <span className="text-xs text-white/30">GRID AI · Ask me anything about your event</span>
              </div>

              {/* Textarea */}
              <div className="relative px-5 pb-2">
                {isListening && interimTranscript && (
                  <div className="absolute top-2 left-8 right-8 text-white/30 text-base italic pointer-events-none truncate">
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
                  rows={4}
                  className="w-full bg-transparent text-white placeholder:text-white/25 text-base resize-none focus:outline-none leading-relaxed py-2"
                  style={{ minHeight: '110px', maxHeight: '200px' }}
                />
              </div>

              {/* Input bar */}
              <div className="border-t border-white/10 px-4 py-3 flex items-center justify-between">
                <button
                  onClick={() => { if (!mounted || !micSupported) return; if (isListening) { stopListening(); } else { startListening(); } }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                >
                  <Mic size={16} />
                  <span>{isListening ? 'Listening...' : 'Voice'}</span>
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!briefText.trim() || isSubmitting}
                  className={`flex items-center gap-2 py-2.5 px-5 rounded-lg text-sm font-medium transition-all ${briefText.trim() ? 'bg-[#c39bff] text-black hover:bg-[#b48af0]' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
                >
                  {isSubmitting
                    ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <><span>Get Recommendations</span><ArrowRight size={15} /></>
                  }
                </button>
              </div>
            </div>
          )}

          {/* Suggestion chips */}
          {!hasConversation && (
            <div className="flex flex-wrap justify-center gap-2">
              {['Wedding sangeet in Delhi', 'Corporate event Mumbai', 'College fest band'].map((ex) => (
                <button key={ex} onClick={() => { setBriefText(ex); textareaRef.current?.focus(); }}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/8 transition-all text-xs">
                  {ex}
                </button>
              ))}
            </div>
          )}

          {/* CTA + stats row */}
          {!hasConversation && (
            <div className="flex items-center justify-between w-full pt-2">
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => router.push('/brief')}
                  className="flex items-center gap-2 bg-[#c39bff] text-black py-3 px-6 rounded-lg text-sm font-medium hover:bg-[#b48af0] transition-all">
                  Hire an Artist <ArrowRight size={16} />
                </button>
                <button onClick={() => router.push('/agency/join')}
                  className="flex items-center gap-2 border border-white/15 bg-white/[0.04] text-white py-3 px-5 rounded-lg text-sm font-medium hover:bg-white/[0.08] hover:border-[#c39bff]/40 transition-all">
                  Event Company OS <span className="text-[10px] text-white/40">· CRM</span>
                </button>
                <button onClick={() => router.push('/artist/onboarding')}
                  className="text-[#b8b8b8] text-sm font-medium hover:text-white transition-colors px-3">
                  Join as Artist
                </button>
              </div>
              <div className="hidden md:flex gap-10 items-center">
                <div className="text-center">
                  <div className="text-3xl font-light text-white">5K+</div>
                  <div className="text-xs text-[#b8b8b8]">Verified artists</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-light text-white">30+</div>
                  <div className="text-xs text-[#b8b8b8]">Indian cities</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
