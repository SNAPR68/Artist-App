import { NextRequest, NextResponse } from 'next/server';

// ElevenLabs voice IDs — curated for Indian market
// Zara = English female, Kabir = Hindi male
// Override via env vars: ELEVENLABS_VOICE_EN, ELEVENLABS_VOICE_HI
const VOICE_IDS: Record<string, string> = {
  'en': process.env.ELEVENLABS_VOICE_EN ?? 'EXAVITQu4vr4xnSDxMaL', // Sarah — clear female English (Zara)
  // For best Hindi, use ElevenLabs Hindi-optimized voices from their library
  // Liam (TX3LPaxmHKxFdv7VOQHJ) works with eleven_multilingual_v2 but sounds accented
  // Recommendation: clone a custom Indian Hindi voice or use Monika Sogam (mTSvIrm2hmcnOvb21nW2) if available
  'hi': process.env.ELEVENLABS_VOICE_HI ?? 'TX3LPaxmHKxFdv7VOQHJ',
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  // If no API key, return 503 immediately so health-check probes don't get 400
  if (!apiKey) {
    return NextResponse.json({ error: 'TTS not configured' }, { status: 503 });
  }

  const body = await req.json() as { text: string; lang?: string; stream?: boolean };
  const { text, lang = 'en', stream = false } = body;

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }

  // Truncate to avoid excessive API costs
  const truncated = text.slice(0, 500);

  const voiceId = lang === 'hi' ? VOICE_IDS.hi : VOICE_IDS.en;
  const modelId = 'eleven_multilingual_v2'; // supports Hindi + English

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: truncated,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('ElevenLabs TTS error:', response.status, err);
      return NextResponse.json({ error: 'TTS API error' }, { status: 502 });
    }

    // Streaming mode: pipe ElevenLabs stream directly to client
    // Browser can start playing audio as chunks arrive (lower TTFB)
    if (stream && response.body) {
      return new NextResponse(response.body as ReadableStream, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-store',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // Non-streaming: buffer full response then send (legacy behavior)
    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('TTS fetch failed:', err);
    return NextResponse.json({ error: 'TTS request failed' }, { status: 500 });
  }
}
