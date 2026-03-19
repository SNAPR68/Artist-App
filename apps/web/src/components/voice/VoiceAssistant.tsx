'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useVoiceRecognition } from './useVoiceRecognition';
import { VoiceWaveform } from './VoiceWaveform';
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

interface Message {
  role: 'user' | 'assistant';
  text: string;
  suggestions?: string[];
  action?: VoiceResponse['action'];
}

export function VoiceAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
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
        const res = await apiClient<VoiceResponse>('/v1/voice/query', {
          method: 'POST',
          body: JSON.stringify({
            text,
            session_id: sessionId,
            current_page: pathname,
          }),
        });

        if (res.success && res.data) {
          const data = res.data;
          setSessionId(data.session_id);
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              text: data.response_text,
              suggestions: data.suggestions,
              action: data.action,
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
    sendQueryCb(suggestion);
  }

  function handleNavigateAction(route: string) {
    router.push(route);
    setIsOpen(false);
  }

  // Don't render if not authenticated
  if (!user) return null;

  return (
    <>
      {/* Floating Mic Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center"
          aria-label="Voice Assistant"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </button>
      )}

      {/* Voice Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsOpen(false)}
          />

          {/* Bottom Sheet */}
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl shadow-2xl max-h-[75vh] flex flex-col animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900">Voice Assistant</h3>
              <div className="flex items-center gap-2">
                {!isSupported && (
                  <span className="text-xs text-amber-600">Mic not supported</span>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <p className="text-sm">Tap the mic and speak, or type below.</p>
                  <p className="text-xs mt-1">
                    Try: &quot;Show my bookings&quot; or &quot;Find DJ for wedding in
                    Mumbai&quot;
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    {/* Navigation action card */}
                    {msg.action?.type === 'navigate' && msg.action.route && (
                      <button
                        onClick={() => handleNavigateAction(msg.action!.route!)}
                        className="mt-2 w-full text-left text-xs bg-white text-blue-600 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition"
                      >
                        Go to page &rarr;
                      </button>
                    )}
                    {/* Suggestion chips */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {msg.suggestions.map((s, j) => (
                          <button
                            key={j}
                            onClick={() => handleSuggestionClick(s)}
                            className="text-xs bg-white text-gray-700 border border-gray-200 rounded-full px-2.5 py-1 hover:bg-gray-50 transition"
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

            {/* Waveform + interim transcript */}
            {state === 'listening' && (
              <div className="px-4 py-2 text-center border-t bg-blue-50">
                <VoiceWaveform isActive={true} />
                {interimTranscript && (
                  <p className="text-xs text-gray-500 italic mt-1">{interimTranscript}</p>
                )}
                <p className="text-xs text-blue-600 mt-1">Listening...</p>
              </div>
            )}
            {state === 'processing' && (
              <div className="px-4 py-2 text-center border-t bg-gray-50">
                <p className="text-xs text-gray-500">Processing...</p>
              </div>
            )}
            {state === 'responding' && (
              <div className="px-4 py-2 text-center border-t bg-green-50">
                <p className="text-xs text-green-600">Speaking...</p>
              </div>
            )}

            {/* Input area */}
            <div className="px-4 py-3 border-t bg-white flex items-center gap-2">
              {/* Mic button */}
              <button
                onClick={handleMicClick}
                disabled={!isSupported || state === 'processing' || state === 'responding'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  state === 'listening'
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </button>

              {/* Text input fallback */}
              <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Or type here..."
                  className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={state !== 'idle'}
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || state !== 'idle'}
                  className="text-blue-600 font-medium text-sm disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Slide-up animation */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
