import { NextRequest, NextResponse } from 'next/server';

// ElevenLabs voice IDs — defaults are curated for Indian market
const VOICE_IDS: Record<string, string> = {
  'en': process.env.ELEVENLABS_VOICE_EN ?? 'EXAVITQu4vr4xnSDxMaL', // Sarah — clear female English
  'hi': process.env.ELEVENLABS_VOICE_HI ?? 'VESUG427mhGhpQ6fo6Rh', // Ravikant — warm native Hindi male
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  const body = await req.json() as { text: string; lang?: string };
  const { text, lang = 'en' } = body;

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }

  // Truncate to avoid excessive API costs
  const truncated = text.slice(0, 500);

  // If no API key, return 503 so client falls back to browser TTS
  if (!apiKey) {
    return NextResponse.json({ error: 'TTS not configured' }, { status: 503 });
  }

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
