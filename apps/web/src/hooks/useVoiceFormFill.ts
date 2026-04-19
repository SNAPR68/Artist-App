/**
 * useVoiceFormFill — voice-powered form filling for any page.
 *
 * Sends speech to /api/chat with surface='form' and a formContext
 * describing the available fields. Claude extracts values and returns
 * { action: 'fill_fields', fields: { fieldName: value, ... } }
 * alongside natural speech.
 *
 * Usage:
 *   const { messages, isListening, isProcessing, startListening,
 *           stopListening, sendText, micSupported } = useVoiceFormFill({
 *     formContext,
 *     onFieldUpdate: (fields) => setMyFormState(prev => ({ ...prev, ...fields })),
 *   });
 */
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface VoiceMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface FormContext {
  /** Human-readable page description, e.g. "event brief form" */
  page: string;
  /** List of fillable fields with their labels and allowed values */
  fields: Array<{
    name: string;       // internal key, e.g. "event_type"
    label: string;      // human label, e.g. "Event type"
    type: 'text' | 'select' | 'date' | 'number';
    options?: string[]; // for select fields
  }>;
}

export interface UseVoiceFormFillOptions {
  formContext: FormContext;
  onFieldUpdate: (fields: Record<string, string>) => void;
  onSpeak?: (text: string) => void;
}

export function useVoiceFormFill({ formContext, onFieldUpdate, onSpeak }: UseVoiceFormFillOptions) {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    setMicSupported(!!SpeechRecognition);
  }, []);

  const speakText = useCallback((text: string) => {
    if (onSpeak) { onSpeak(text); return; }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'en-IN';
      utt.rate = 1.05;
      window.speechSynthesis.speak(utt);
    }
  }, [onSpeak]);

  const sendText = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return;
    setIsProcessing(true);
    setMessages(prev => [...prev, { role: 'user', text }]);

    try {
      const history = [...messages, { role: 'user' as const, text }].map(m => ({
        role: m.role,
        content: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          sessionId,
          surface: 'form',
          formContext,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`chat ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamedText = '';
      let assistantIndex = 0;
      setMessages(prev => { assistantIndex = prev.length; return [...prev, { role: 'assistant', text: '' }]; });

      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) { done = true; break; }
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
            streamedText += (data as { delta?: string }).delta ?? '';
            const current = streamedText;
            setMessages(prev => {
              const next = [...prev];
              if (next[assistantIndex]) next[assistantIndex] = { ...next[assistantIndex], text: current };
              return next;
            });
          } else if (event === 'done') {
            const final = data as {
              text?: string;
              action?: { type: string; fields?: Record<string, string> };
              sessionId?: string;
            };
            if (final.sessionId) setSessionId(final.sessionId);
            const finalText = final.text ?? streamedText;
            setMessages(prev => {
              const next = [...prev];
              if (next[assistantIndex]) next[assistantIndex] = { ...next[assistantIndex], text: finalText };
              return next;
            });
            if (final.action?.type === 'fill_fields' && final.action.fields) {
              onFieldUpdate(final.action.fields);
            }
            if (finalText) speakText(finalText);
          }
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: "Couldn't process that — please try again." }]);
    }
    setIsProcessing(false);
  }, [isProcessing, messages, sessionId, formContext, onFieldUpdate, speakText]);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setInterimTranscript(interim);
      if (final) { setIsListening(false); setInterimTranscript(''); sendText(final.trim()); }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [sendText]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { messages, isListening, isProcessing, micSupported, interimTranscript, startListening, stopListening, sendText };
}
