import { NextResponse } from 'next/server'

interface VoiceSettings {
  stability: number
  similarity_boost: number
  style?: number
  use_speaker_boost?: boolean
}

interface RequestBody {
  text: string
  model_id: string
  voice_id: string
  voice_settings: VoiceSettings
  voice_latency: number
  output_format: string
  language_code?: string
  seed?: number
  previous_text?: string
  next_text?: string
  previous_request_ids?: string[]
  next_request_ids?: string[]
}

interface ElevenLabsRequestBody {
  text: string
  model_id: string
  voice_settings: VoiceSettings
  voice_latency: number
  output_format: string
  language_code?: string
  seed?: number
  previous_text?: string
  next_text?: string
  previous_request_ids?: string[]
  next_request_ids?: string[]
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json()

    const apiKey = request.headers.get('x-api-key') || process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key is not provided' }, { status: 400 })
    }

    const {
      text,
      model_id,
      voice_id,
      voice_settings,
      voice_latency,
      output_format,
      language_code,
      seed,
      previous_text,
      next_text,
      previous_request_ids,
      next_request_ids
    } = body

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`

    const requestBody: ElevenLabsRequestBody = {
      text,
      model_id,
      voice_settings,
      voice_latency,
      output_format
    }

    // Add optional fields only if they are present
    if (language_code) requestBody.language_code = language_code
    if (seed !== undefined) requestBody.seed = seed
    if (previous_text) requestBody.previous_text = previous_text
    if (next_text) requestBody.next_text = next_text
    if (previous_request_ids && previous_request_ids.length > 0) requestBody.previous_request_ids = previous_request_ids
    if (next_request_ids && next_request_ids.length > 0) requestBody.next_request_ids = next_request_ids

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ error: errorData.detail || 'Failed to generate speech' }, { status: response.status })
    }

    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')

    return NextResponse.json({ audio: base64Audio })
  } catch (error) {
    console.error('Error in text-to-speech API:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}