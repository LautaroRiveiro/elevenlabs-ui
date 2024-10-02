import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const apiKey = request.headers.get('x-api-key') || process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ElevenLabs API key is not provided' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const voiceId = searchParams.get('voiceId')

  if (!voiceId) {
    return NextResponse.json({ error: 'Voice ID is required' }, { status: 400 })
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}/settings`, {
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch voice settings')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching voice settings:', error)
    return NextResponse.json({ error: 'Failed to fetch voice settings' }, { status: 500 })
  }
}