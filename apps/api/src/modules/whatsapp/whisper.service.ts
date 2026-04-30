/**
 * Whisper transcription service.
 * Fetches a media URL (from WhatsApp provider), uploads to OpenAI Whisper,
 * returns transcribed text.
 *
 * Env: OPENAI_API_KEY
 */

import { logger } from '../../utils/logger.js';

export class WhisperService {
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY ?? '';
  }

  get enabled(): boolean {
    return !!this.apiKey;
  }

  /**
   * Transcribe audio from a public or provider-authenticated URL.
   * For Interakt/Gupshup/Meta, the media URL requires the provider API key in the header.
   */
  async transcribeUrl(mediaUrl: string, mimeType = 'audio/ogg'): Promise<string | null> {
    if (!this.enabled) {
      logger.warn('[WHISPER] OPENAI_API_KEY not set — skipping transcription');
      return null;
    }

    try {
      // Fetch the audio blob from the provider CDN
      const mediaRes = await fetch(mediaUrl, {
        headers: {
          // Interakt CDN requires the API key as a bearer token
          ...(process.env.WHATSAPP_API_KEY
            ? { Authorization: `Basic ${process.env.WHATSAPP_API_KEY}` }
            : {}),
        },
      });

      if (!mediaRes.ok) {
        logger.warn(`[WHISPER] Failed to fetch media ${mediaUrl}: ${mediaRes.status}`);
        return null;
      }

      const audioBuffer = await mediaRes.arrayBuffer();
      const ext = mimeType.includes('mp4') ? 'mp4'
        : mimeType.includes('webm') ? 'webm'
        : mimeType.includes('mpeg') || mimeType.includes('mp3') ? 'mp3'
        : 'ogg';

      // Build multipart form data for Whisper
      const form = new FormData();
      form.append('file', new Blob([audioBuffer], { type: mimeType }), `audio.${ext}`);
      form.append('model', 'whisper-1');
      form.append('language', 'hi'); // handles Hinglish well; Whisper auto-detects if wrong

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form,
      });

      if (!whisperRes.ok) {
        const err = await whisperRes.text();
        logger.warn(`[WHISPER] API error ${whisperRes.status}: ${err}`);
        return null;
      }

      const json = await whisperRes.json() as { text?: string };
      const text = json.text?.trim() ?? null;
      logger.info(`[WHISPER] Transcribed: "${text?.slice(0, 100)}"`);
      return text ?? null;
    } catch (err) {
      logger.error('[WHISPER] Transcription failed', { err });
      return null;
    }
  }
}

export const whisperService = new WhisperService();
