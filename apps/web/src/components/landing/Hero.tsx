'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowUp, Mic, Sparkles, ArrowRight } from 'lucide-react';
import { CardRenderer } from '../voice/cards/CardRenderer';
import { useVoiceRecognition } from '../voice/useVoiceRecognition';
import { apiClient } from '../../lib/api-client';
import type { VoiceCard, ClarifyingQuestion } from '@artist-booking/shared';

// ─── Animated gradient border keyframes (injected via <style>) ─
const HERO_STYLES = `
@keyframes borderRotate {
  0% { --border-angle: 0deg; }
  100% { --border-angle: 360deg; }
}
@keyframes pulseGlow {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
@keyframes floatAvatar {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
}
@keyframes orbDrift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(10px, -10px) scale(1.03); }
  66% { transform: translate(-5px, 5px) scale(0.97); }
}
@property --border-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}
`;

// ─── Hero Background Images (removed — using static gradient) ─

const EXAMPLE_BRIEFS = [
  'Delhi wedding, 300 guests, Punjabi singer for sangeet night, 5L budget',
  'Mumbai corporate annual day, 1000 pax, high-energy host + band',
  'Bangalore house party, 50 people, acoustic singer, under 50k',
  'Goa beach wedding, live DJ + dhol player, sunset ceremony',
  'Hyderabad college fest, rapper + beatboxer, 2L budget',
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 100 } },
};

// ─── Conversation Message Types ─────────────────────────────

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
  const resultsRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const [briefText, setBriefText] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<ConvoMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { isListening, transcript, interimTranscript, isSupported: micSupported, startListening, stopListening, resetTranscript } = useVoiceRecognition();

  useEffect(() => { setMounted(true); }, []);

  // Auto-submit when voice transcript is finalized
  const lastTranscriptRef = useRef('');
  useEffect(() => {
    if (transcript && transcript !== lastTranscriptRef.current && !isListening) {
      lastTranscriptRef.current = transcript;
      sendMessage(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, resetTranscript]); // sendMessage excluded to avoid re-render loop — it's stable via useCallback

  // (background slide rotation removed — static gradient now)

  // Rotate placeholder examples (only when no conversation started)
  useEffect(() => {
    if (briefText || messages.length > 0) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % EXAMPLE_BRIEFS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [briefText, messages.length]);

  const violetOrbY = useTransform(scrollY, [0, 500], [0, 150]);
  const cyanOrbY = useTransform(scrollY, [0, 500], [0, -100]);

  // ─── Send message to decision engine brief endpoint ───────
  // The public /v1/decision-engine/brief endpoint handles the full
  // conversational flow: clarifying questions → recommendations.

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setBriefText('');

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', text }]);

    try {
      const body: Record<string, unknown> = {
        raw_text: text,
        source: 'web',
      };
      if (sessionId) body.session_id = sessionId;

      const res = await apiClient<any>('/v1/decision-engine/brief', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.success && res.data) {
        const data = res.data;
        setSessionId(data.session_id);

        if (data.response_type === 'clarifying_questions') {
          setMessages((prev) => [...prev, {
            role: 'assistant',
            text: data.response_text,
            response_type: 'clarifying_questions',
            clarifying_questions: data.clarifying_questions,
            parsed_context: data.parsed_context,
          }]);
          speakText(data.response_text);
        } else if (data.response_type === 'recommendations') {
          const recs = data.recommendations || [];
          const cards: VoiceCard[] = recs.map((rec: any) => ({
            type: 'artist_recommendation' as const,
            data: {
              id: rec.artist_id,
              stage_name: rec.artist_name || 'Artist',
              artist_type: rec.artist_type,
              thumbnail_url: rec.profile_image ?? null,
              score: rec.score,
              confidence: rec.confidence,
              rank: rec.rank,
              price_min_paise: rec.price_min_paise,
              price_max_paise: rec.price_max_paise,
              expected_close_paise: rec.expected_close_paise,
              why_fit: rec.why_fit || [],
              risk_flags: rec.risk_flags || [],
              logistics_flags: rec.logistics_flags || [],
            },
          }));

          setMessages((prev) => [...prev, {
            role: 'assistant',
            text: data.response_text,
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
        role: 'assistant',
        text: 'Sorry, something went wrong. Please try again.',
        follow_up: { question: 'What would you like to do?', options: ['Try again', 'Browse artists'] },
      }]);
    }

    setIsSubmitting(false);

    // Scroll to results
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  }, [isSubmitting, sessionId]);

  // ─── TTS ──────────────────────────────────────────────────

  const speakText = useCallback((text: string) => {
    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang: 'en', stream: true }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        audio.play().catch(() => {});
      })
      .catch(() => {});
  }, []);

  // ─── Handlers ─────────────────────────────────────────────

  const handleSubmit = useCallback(() => {
    sendMessage(briefText.trim());
  }, [briefText, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBriefText(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, []);

  const handleChipClick = useCallback((value: string) => {
    sendMessage(value);
  }, [sendMessage]);



  const hasConversation = messages.length > 0;

  return (
    <>
      {/* Inject animated gradient border styles */}
      <style dangerouslySetInnerHTML={{ __html: HERO_STYLES }} />

      <section
        ref={containerRef}
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0e0e0f] px-6"
      >
        {/* ─── Static Gradient Background ─── */}
        <div className="absolute inset-0 bg-[#0e0e0f]" />

        {/* ─── Subtle noise texture overlay ─── */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none z-[1]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }}
        />

        {/* ─── Ambient Orbs (enhanced with drift animation) ─── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[2]">
          <motion.div style={{ y: violetOrbY }} className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }}>
            <div className="w-full h-full bg-[#c39bff]/20 blur-[160px] rounded-full" style={{ animation: 'orbDrift 12s ease-in-out infinite' }} />
          </motion.div>
          <motion.div style={{ y: cyanOrbY }} className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: 0.2 }}>
            <div className="w-full h-full bg-[#a1faff]/12 blur-[140px] rounded-full" style={{ animation: 'orbDrift 15s ease-in-out infinite reverse' }} />
          </motion.div>
          {/* Third orb — warm accent for depth */}
          <motion.div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2, delay: 0.5 }}>
            <div className="w-full h-full bg-[#c39bff]/8 blur-[120px] rounded-full" style={{ animation: 'orbDrift 18s ease-in-out infinite' }} />
          </motion.div>
        </div>

        {/* ─── Main Content ─── */}
        <div className="relative z-10 max-w-4xl w-full text-center pt-20">
          <motion.div className="space-y-5" variants={containerVariants} initial="hidden" animate="visible">

            {/* Headline */}
            <motion.h1 variants={itemVariants} className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter leading-[1.05] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
              Run your event business.
              <br />
              <span className="relative inline-block bg-gradient-to-r from-[#c39bff] via-[#b68cf6] to-[#a1faff] bg-clip-text text-transparent">
                All on one platform.
                <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-[#c39bff] via-[#b68cf6] to-[#a1faff] opacity-60 animate-[shimmer_2.5s_ease-in-out_infinite]" />
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p variants={itemVariants} className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              <span className="text-[#c39bff]">Artists grow careers.</span>{' '}
              <span className="text-[#a1faff]">Companies build events.</span>{' '}
              <span className="text-white/70">The industry moves — all on one platform.</span>
            </motion.p>

            {/* ─── "Powered by AI" Badge ─── */}
            <motion.div variants={itemVariants} className="flex items-center justify-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#c39bff]/20 bg-[#c39bff]/5 backdrop-blur-sm">
                <Sparkles size={12} className="text-[#c39bff]" style={{ animation: 'pulseGlow 2s ease-in-out infinite' }} />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#c39bff]/80">Powered by AI</span>
              </div>
            </motion.div>

            {/* ─── Chat-Style Input (White) with animated gradient border ─── */}
            <motion.div variants={itemVariants} className="relative mx-auto">
              {/* Animated gradient border layer */}
              <div
                className="absolute -inset-[2px] rounded-[18px] opacity-70 group-focus-within:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'conic-gradient(from var(--border-angle, 0deg), #c39bff, #a1faff, #c39bff, #b68cf6, #c39bff)',
                  animation: 'borderRotate 4s linear infinite, pulseGlow 3s ease-in-out infinite',
                  filter: 'blur(1px)',
                }}
              />
              <div
                className="relative rounded-2xl transition-all duration-300"
                style={{
                  background: 'rgba(255, 255, 255, 0.97)',
                  boxShadow: '0 0 60px rgba(195, 155, 255, 0.18), 0 0 120px rgba(161, 250, 255, 0.06), 0 12px 48px rgba(0, 0, 0, 0.25)',
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={briefText}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  aria-label="Describe your event to get artist recommendations"
                  placeholder={hasConversation ? 'Reply to Zara...' : EXAMPLE_BRIEFS[placeholderIndex]}
                  rows={hasConversation ? 2 : 4}
                  className="w-full bg-transparent text-[#1a1a1d] placeholder:text-black/30 text-base md:text-lg lg:text-xl px-5 md:px-7 pt-5 md:pt-6 pb-14 resize-none focus:outline-none leading-relaxed"
                  style={{ minHeight: hasConversation ? '80px' : '160px', maxHeight: '240px' }}
                />

                {/* Bottom toolbar */}
                {/* Interim transcript overlay */}
                {isListening && interimTranscript && (
                  <div className="absolute top-4 left-7 right-7 text-black/40 text-lg italic pointer-events-none">
                    {interimTranscript}
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (!mounted || !micSupported) return;
                      isListening ? stopListening() : startListening();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                      isListening
                        ? 'bg-red-500/15 text-red-500 animate-pulse'
                        : 'text-black/30 hover:text-[#7c3aed] hover:bg-[#7c3aed]/10'
                    }`}
                    title={isListening ? 'Stop recording' : 'Start voice input'}
                  >
                    {/* Zara avatar */}
                    <span
                      className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-[#c39bff] to-[#8A2BE2] text-white text-[9px] font-bold flex-shrink-0 shadow-sm"
                      style={{ animation: 'floatAvatar 3s ease-in-out infinite' }}
                    >
                      Z
                    </span>
                    <Mic size={14} />
                    <span className="hidden sm:inline">{isListening ? 'Listening...' : 'Voice'}</span>
                  </button>

                  <motion.button
                    onClick={handleSubmit}
                    disabled={!briefText.trim() || isSubmitting}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Submit event brief"
                    className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
                      briefText.trim()
                        ? 'bg-[#1a1a1d] text-white shadow-lg cursor-pointer'
                        : 'bg-black/10 text-black/20 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowUp size={18} strokeWidth={2.5} />
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Example chips — only show when no conversation */}
              {!hasConversation && (
                <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
                  {['Wedding sangeet in Delhi', 'Corporate event Mumbai', 'College fest band', 'House party DJ'].map((example) => (
                    <button
                      key={example}
                      onClick={() => { setBriefText(example); textareaRef.current?.focus(); }}
                      className="px-4 py-2 rounded-full border border-white/15 text-white/60 hover:text-white hover:border-[#c39bff]/40 hover:shadow-[0_0_20px_rgba(195,155,255,0.12)] transition-all duration-300 text-xs font-medium"
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                      }}
                    >
                      {example}
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>

            {/* ─── Two Entry Cards (enhanced) ─── */}
            {!hasConversation && (
              <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 max-w-xl mx-auto">
                {/* Artists Card */}
                <motion.button
                  onClick={() => router.push('/artist/onboarding')}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  aria-label="Sign up as an artist on GRID"
                  className="group relative flex items-center gap-4 px-6 py-5 rounded-2xl border border-[#c39bff]/30 hover:border-[#c39bff]/60 transition-all duration-300 overflow-hidden"
                  style={{
                    background: 'rgba(195, 155, 255, 0.06)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: '0 0 30px rgba(195, 155, 255, 0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#c39bff]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#c39bff]/20 to-[#c39bff]/5 flex items-center justify-center group-hover:from-[#c39bff]/30 group-hover:to-[#c39bff]/10 transition-all duration-300 flex-shrink-0 shadow-lg shadow-[#c39bff]/10">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c39bff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <div className="relative text-left">
                    <p className="text-sm font-bold text-white group-hover:text-[#c39bff] transition-colors">For Artists</p>
                    <p className="text-xs text-white/40 mt-0.5">Grow your career on GRID</p>
                  </div>
                  <ArrowRight size={16} className="ml-auto text-white/20 group-hover:text-[#c39bff]/60 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                </motion.button>

                {/* Event Companies Card */}
                <motion.button
                  onClick={() => router.push('/agency/join')}
                  whileHover={{ scale: 1.03, y: -4 }}
                  aria-label="Set up your event company on GRID"
                  whileTap={{ scale: 0.97 }}
                  className="group relative flex items-center gap-4 px-6 py-5 rounded-2xl border border-[#a1faff]/30 hover:border-[#a1faff]/60 transition-all duration-300 overflow-hidden"
                  style={{
                    background: 'rgba(161, 250, 255, 0.06)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: '0 0 30px rgba(161, 250, 255, 0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#a1faff]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#a1faff]/20 to-[#a1faff]/5 flex items-center justify-center group-hover:from-[#a1faff]/30 group-hover:to-[#a1faff]/10 transition-all duration-300 flex-shrink-0 shadow-lg shadow-[#a1faff]/10">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a1faff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div className="relative text-left">
                    <p className="text-sm font-bold text-white group-hover:text-[#a1faff] transition-colors">For Event Companies</p>
                    <p className="text-xs text-white/40 mt-0.5">Run your agency on GRID</p>
                  </div>
                  <ArrowRight size={16} className="ml-auto text-white/20 group-hover:text-[#a1faff]/60 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ─── Inline Conversation Results ─── */}
      {/* ═══════════════════════════════════════════════════════ */}
      {hasConversation && (
        <section ref={resultsRef} className="relative bg-[#0e0e0f] px-6 py-12 min-h-[50vh]">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[90%] space-y-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Role label */}
                  <span className={`text-[10px] uppercase tracking-widest font-bold ${
                    msg.role === 'user' ? 'text-white/30' : 'text-[#c39bff]/60'
                  }`}>
                    {msg.role === 'user' ? 'You' : 'Zara'}
                  </span>

                  {/* Message bubble */}
                  <div
                    className={`rounded-2xl px-5 py-3 ${
                      msg.role === 'user'
                        ? 'bg-[#c39bff] text-white'
                        : 'glass-card border border-white/10 text-white'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>

                  {/* Parsed context tags */}
                  {msg.parsed_context && Object.keys(msg.parsed_context).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(msg.parsed_context).map(([key, val]) => (
                        <span key={key} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">
                          {key}: {String(val)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Clarifying questions with option chips */}
                  {msg.clarifying_questions && msg.clarifying_questions.length > 0 && (
                    <div className="space-y-3">
                      {msg.clarifying_questions.map((q, qi) => (
                        <div key={qi}>
                          <p className="text-xs text-white/50 mb-2">{q.question}</p>
                          <div className="flex flex-wrap gap-2">
                            {q.options.map((opt) => (
                              <button
                                key={String(opt.value)}
                                onClick={() => handleChipClick(String(opt.value === 'skip' ? 'skip' : opt.label))}
                                className="text-xs bg-[#c39bff]/15 text-[#c39bff] hover:bg-[#c39bff]/25 rounded-full px-3 py-1.5 transition-all border border-[#c39bff]/25 font-medium"
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Rich visual cards */}
                  {msg.cards && msg.cards.length > 0 && (
                    <CardRenderer cards={msg.cards} />
                  )}

                  {/* Follow-up prompt */}
                  {msg.follow_up && !msg.clarifying_questions && (
                    <div className="rounded-xl border border-[#c39bff]/20 bg-[#c39bff]/5 px-4 py-3 space-y-2">
                      <p className="text-xs text-white/50">{msg.follow_up.question}</p>
                      <div className="flex flex-wrap gap-2">
                        {msg.follow_up.options.map((opt, j) => (
                          <button
                            key={j}
                            onClick={() => handleChipClick(opt)}
                            className="text-xs bg-[#c39bff]/15 text-[#c39bff] hover:bg-[#c39bff]/25 rounded-full px-3 py-1.5 transition-all border border-[#c39bff]/25 font-medium"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Loading state */}
            {isSubmitting && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="glass-card border border-white/10 rounded-2xl px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#c39bff]/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-[#c39bff]/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-[#c39bff]/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-white/30">Zara is thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
