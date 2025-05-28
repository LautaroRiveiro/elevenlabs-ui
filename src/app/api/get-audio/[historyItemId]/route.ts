// filepath: d:\Documents\elevenlabs-ui\src\app\api\get-audio\[historyItemId]\route.ts
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { historyItemId: string } }
) {
  const apiKey = request.headers.get('x-api-key') || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ElevenLabs API key is not provided' }, { status: 400 });
  }

  const { historyItemId } = params;

  if (!historyItemId) {
    return NextResponse.json({ error: 'History item ID is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/history/${historyItemId}/audio`, {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('ElevenLabs API Error:', errorData);
      return NextResponse.json({ error: errorData.detail || 'Failed to fetch audio' }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Error fetching audio:', error);
    return NextResponse.json({ error: 'An unexpected error occurred while fetching audio' }, { status: 500 });
  }
}