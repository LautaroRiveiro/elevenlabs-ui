import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const apiKey = request.headers.get('x-api-key') || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ElevenLabs API key is not provided' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  console.log(searchParams.toString());
  const voiceId = searchParams.get('voice_id');
  const pageSize = searchParams.get('page_size') || '1000'; // Default to 100, max 1000
  const startAfterHistoryItemId = searchParams.get('start_after_history_item_id');

  // The voiceId is received from the client.
  // The check below ensures the client sends it, as client-side logic expects to filter by it.
  if (!voiceId) {
    return NextResponse.json({ error: 'Voice ID is required by the client for filtering' }, { status: 400 });
  }

  const elevenLabsUrl = new URL(`https://api.elevenlabs.io/v1/history`);
  elevenLabsUrl.searchParams.append('page_size', pageSize);
  elevenLabsUrl.searchParams.append('voice_id', voiceId); // This is for our API route, not directly for ElevenLabs history endpoint filtering by voice

  // Note: The ElevenLabs API GET /v1/history endpoint does not support filtering by 'voice_id' as a query parameter.
  // The history items returned by the API include 'voice_id', and filtering is performed client-side
  // in the HistoryPage.tsx component after fetching the data.
  // Therefore, 'voiceId' is not added to 'elevenLabsUrl.searchParams'.

  if (startAfterHistoryItemId) {
    elevenLabsUrl.searchParams.append('start_after_history_item_id', startAfterHistoryItemId);
  }

  console.log(elevenLabsUrl.toString())

  try {
    const response = await fetch(elevenLabsUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('ElevenLabs API Error:', errorData);
      return NextResponse.json({ error: errorData.detail || 'Failed to fetch history' }, { status: response.status });
    }

    const data = await response.json();
    // console.log('Fetched history data:', data);
    const filteredHistoryForSelectedVoice = data.history.filter((item: { voice_id: string; }) => item.voice_id === voiceId);
    return NextResponse.json({ ...data, history: filteredHistoryForSelectedVoice });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'An unexpected error occurred while fetching history' }, { status: 500 });
  }
}