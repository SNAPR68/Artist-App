'use client';

/**
 * ClientDetailsModal — collects client info before proposal generation.
 *
 * Voice-first: Zara asks "Who's this proposal for?" and fills
 * contact_name, contact_email, client_notes by voice.
 * All fields optional — user can skip and generate immediately.
 */

import { useState, useRef, useEffect } from 'react';
import { X, Send, Mic, MicOff, FileText, ArrowRight } from 'lucide-react';
import { useVoiceFormFill } from '@/hooks/useVoiceFormFill';

interface ClientDetails {
  contact_name: string;
  contact_email: string;
  client_notes: string;
  include_pricing: boolean;
}

interface Props {
  artistCount: number;
  onConfirm: (details: ClientDetails) => void;
  onCancel: () => void;
}

const CLIENT_FORM_CONTEXT = {
  page: 'proposal client details',
  fields: [
    { name: 'contact_name', label: "Client's name or company", type: 'text' as const },
    { name: 'contact_email', label: "Client's email", type: 'text' as const },
    { name: 'client_notes', label: 'Notes for the proposal (special requirements, tone, message)', type: 'text' as const },
    { name: 'include_pricing', label: 'Include pricing in proposal (yes/no)', type: 'select' as const, options: ['yes', 'no'] },
  ],
};

export default function ClientDetailsModal({ artistCount, onConfirm, onCancel }: Props) {
  const [details, setDetails] = useState<ClientDetails>({
    contact_name: '',
    contact_email: '',
    client_notes: '',
    include_pricing: true,
  });
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isListening, isProcessing, micSupported, interimTranscript, startListening, stopListening, sendText } =
    useVoiceFormFill({
      formContext: CLIENT_FORM_CONTEXT,
      onFieldUpdate: (updated) => {
        setDetails((prev) => ({
          ...prev,
          ...(updated.contact_name ? { contact_name: updated.contact_name } : {}),
          ...(updated.contact_email ? { contact_email: updated.contact_email } : {}),
          ...(updated.client_notes ? { client_notes: updated.client_notes } : {}),
          ...(updated.include_pricing !== undefined
            ? { include_pricing: updated.include_pricing === 'yes' || updated.include_pricing === 'true' }
            : {}),
        }));
      },
    });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const hasGreeted = useRef(false);
  useEffect(() => {
    if (!hasGreeted.current) {
      hasGreeted.current = true;
      sendText(`I'm about to generate a proposal for ${artistCount} artist${artistCount > 1 ? 's' : ''}. Who is this proposal for?`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendText(inputText.trim());
    setInputText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-[640px] rounded-2xl border border-white/[0.12] bg-[#0e0e0f] overflow-hidden flex flex-col shadow-2xl"
        style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c39bff]/15 flex items-center justify-center">
              <FileText size={18} className="text-[#c39bff]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Prepare Proposal</h2>
              <p className="text-xs text-white/40">
                {artistCount} artist{artistCount > 1 ? 's' : ''} selected · Zara will help you fill this
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/30 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        {/* Voice chat */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-hide" style={{ minHeight: '180px', maxHeight: '280px' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2.5'}`}
              style={{ animation: 'fadeIn 0.25s ease-out both' }}>
              {msg.role === 'assistant' && (
                <div className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-[#c39bff]/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#c39bff]">Z</span>
                </div>
              )}
              <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user' ? 'bg-[#c39bff] text-black' : 'bg-white/[0.07] border border-white/10 text-white'
              }`}>
                {msg.text || <span className="opacity-40 italic">...</span>}
              </div>
            </div>
          ))}
          {isProcessing && (
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
            <p className="text-center text-xs text-[#c39bff] animate-pulse">
              {interimTranscript || 'Listening...'}
            </p>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Voice input bar */}
        <div className="shrink-0 border-t border-white/10 px-4 py-3 flex items-center gap-3">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={!micSupported}
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
              isListening ? 'bg-red-500 text-white animate-pulse' : micSupported ? 'bg-white/[0.06] border border-white/10 text-white/40 hover:text-white/80' : 'opacity-30 cursor-not-allowed'
            }`}
          >
            {micSupported ? <Mic size={15} /> : <MicOff size={15} />}
          </button>
          <div className="flex-1 flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/10 focus-within:border-[#c39bff]/50 px-3 transition-all">
            <input type="text" value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
              placeholder="Or type here..."
              className="flex-1 bg-transparent text-white placeholder:text-white/25 text-sm py-2 focus:outline-none"
            />
            <button onClick={handleSend} disabled={!inputText.trim()}
              className="text-[#c39bff] hover:text-[#b48af0] disabled:text-white/10 transition-colors">
              <Send size={15} />
            </button>
          </div>
        </div>

        {/* Filled fields preview */}
        <div className="shrink-0 px-5 py-3 border-t border-white/10 bg-white/[0.02] space-y-2">
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-2">Proposal Details</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Client name" value={details.contact_name}
              onChange={(e) => setDetails(p => ({ ...p, contact_name: e.target.value }))}
              className="input-nocturne text-sm py-2 px-3 rounded-lg" />
            <input type="email" placeholder="Client email (optional)" value={details.contact_email}
              onChange={(e) => setDetails(p => ({ ...p, contact_email: e.target.value }))}
              className="input-nocturne text-sm py-2 px-3 rounded-lg" />
          </div>
          <textarea placeholder="Notes for the proposal (e.g. focus on Bollywood, keep it formal)..."
            value={details.client_notes}
            onChange={(e) => setDetails(p => ({ ...p, client_notes: e.target.value }))}
            rows={2}
            className="input-nocturne w-full text-sm py-2 px-3 rounded-lg resize-none" />
          <label className="flex items-center gap-2 text-sm text-white/50 cursor-pointer select-none">
            <input type="checkbox" checked={details.include_pricing}
              onChange={(e) => setDetails(p => ({ ...p, include_pricing: e.target.checked }))}
              className="accent-[#c39bff]" />
            Include pricing in proposal
          </label>
        </div>

        {/* Actions */}
        <div className="shrink-0 px-5 py-4 border-t border-white/10 flex items-center justify-between">
          <button onClick={onCancel} className="text-sm text-white/30 hover:text-white/60 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(details)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#c39bff] to-[#8A2BE2] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
          >
            Generate Proposal <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
