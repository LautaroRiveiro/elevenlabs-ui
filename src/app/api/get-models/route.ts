import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const apiKey = request.headers.get('x-api-key') || process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ElevenLabs API key is not provided' }, { status: 400 })
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/models', {
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch models')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching models:', error)
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 })
  }
}