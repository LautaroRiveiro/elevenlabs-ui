import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${body.voice_id}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text: body.text,
      model_id: body.model_id,
      voice_settings: {
        stability: body.voice_settings.stability,
        similarity_boost: body.voice_settings.similarity_boost
      },
      voice_latency: body.voice_latency,
      output_format: body.output_format
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    return NextResponse.json({ error: errorData.detail || 'Failed to generate speech' }, { status: response.status });
  }

  const audioBuffer = await response.arrayBuffer();
  const audioBase64 = Buffer.from(audioBuffer).toString('base64');

  return NextResponse.json({ audio: audioBase64 });
}