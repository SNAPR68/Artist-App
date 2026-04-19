'use client';

/**
 * VoiceFillButton — drop onto any form page.
 *
 * Shows a floating mic pill. Click → opens a chat drawer where Zara
 * asks questions and fills form fields via onFieldUpdate callback.
 *
 * <VoiceFillButton formContext={...} onFieldUpdate={setFields} />
 */

import { useState, useRef, useEffect } from 'react';
import { Mic, X, Send, MicOff } from 'lucide-react';
import { useVoiceFormFill, type FormContext } from '@/hooks/useVoiceFormFill';

interface Props {
  formContext: FormContext;
  onFieldUpdate: (fields: Record<string, string>) => void;
}

export default function VoiceFillButton({ formContext, onFieldUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages, isListening, isProcessing, micSupported,
    interimTranscript, startListening, stopListening, sendText,
  } = useVoiceFormFill({ formContext, onFieldUpdate });

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Greet on first open
  const hasGreeted = useRef(false);
  useEffect(() => {
    if (open && messages.length === 0 && !hasGreeted.current) {
      hasGreeted.current = true;
      sendText(`Hi Zara, I need help filling the ${formContext.page}.`);
    }
  }, [open, messages.length, sendText, formContext.page]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendText(inputText.trim());
    setInputText('');
  };

  return (
    <>
      {/* Floating trigger pill */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-[#c39bff] text-black font-medium text-sm shadow-[0_0_24px_rgba(195,155,255,0.4)] hover:bg-[#b48af0] transition-all"
        aria-label="Fill with voice"
      >
        <Mic size={16} />
        <span>Fill with voice</span>
      </button>

      {/* Drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="w-full max-w-[680px] mx-4 mb-4 rounded-2xl border border-white/[0.12] bg-[#0e0e0f]/95 backdrop-blur-xl overflow-hidden flex flex-col shadow-2xl"
            style={{ height: '520px' }}>

            {/* Header */}
            <div className="shrink-0 px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#c39bff]/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-[#c39bff]">Z</span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">Zara</span>
                  <span className="text-xs text-white/30 ml-2">filling your {formContext.page}</span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/5">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-hide">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2.5'}`}
                  style={{ animation: 'fadeIn 0.25s ease-out both' }}>
                  {msg.role === 'assistant' && (
                    <div className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-[#c39bff]/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-[#c39bff]">Z</span>
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#c39bff] text-black'
                      : 'bg-white/[0.07] border border-white/10 text-white'
                  }`}>
                    {msg.text || <span className="opacity-40 italic">...</span>}
                  </div>
                </div>
              ))}

              {isProcessing && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex justify-start gap-2.5">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-[#c39bff]/20 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-[#c39bff]">Z</span>
                  </div>
                  <div className="bg-white/[0.07] border border-white/10 rounded-xl px-4 py-2.5 flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c39bff]/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c39bff]/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c39bff]/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {isListening && (
                <div className="flex justify-center py-1">
                  <span className="text-xs text-[#c39bff] animate-pulse">
                    {interimTranscript || 'Listening...'}
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="shrink-0 border-t border-white/10 px-4 py-3 flex items-center gap-3">
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={!micSupported}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-[0_0_16px_rgba(239,68,68,0.5)]'
                    : micSupported
                      ? 'bg-white/[0.06] border border-white/10 text-white/40 hover:text-white/80 hover:bg-white/10'
                      : 'bg-white/[0.03] text-white/20 cursor-not-allowed'
                }`}
              >
                {micSupported ? <Mic size={17} /> : <MicOff size={17} />}
              </button>

              <div className="flex-1 flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/10 focus-within:border-[#c39bff]/50 transition-all px-4">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
                  placeholder="Or type here..."
                  className="flex-1 bg-transparent text-white placeholder:text-white/25 text-sm py-2.5 focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || isProcessing}
                  className="text-[#c39bff] hover:text-[#b48af0] disabled:text-white/10 transition-colors shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
