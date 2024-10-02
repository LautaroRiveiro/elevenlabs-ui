import { NextResponse } from 'next/server'

interface RequestBody {
  text: string
  model_id: string
  voice_id: string
  voice_settings: {
    stability: number
    similarity_boost: number
    style?: number
    use_speaker_boost?: boolean
  }
  voice_latency: number
  output_format: string
  language_code?: string
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json()
    const {
      text,
      model_id,
      voice_id,
      voice_settings,
      voice_latency,
      output_format,
      language_code
    } = body

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`

    const headers = {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    }

    const requestBody: any = {
      text,
      model_id,
      voice_settings: {
        stability: voice_settings.stability,
        similarity_boost: voice_settings.similarity_boost
      },
      voice_latency,
      output_format
    }

    // Incluir style y use_speaker_boost solo si están definidos
    if (voice_settings.style !== undefined) {
      requestBody.voice_settings.style = voice_settings.style
    }
    if (voice_settings.use_speaker_boost !== undefined) {
      requestBody.voice_settings.use_speaker_boost = voice_settings.use_speaker_boost
    }

    // Solo incluir language_code si el modelo es Turbo v2.5
    if (model_id === 'eleven_turbo_v2_5' && language_code) {
      requestBody.language_code = language_code
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ error: errorData.detail }, { status: response.status })
    }

    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')

    return NextResponse.json({ audio: base64Audio })
  } catch (error) {
    console.error('Error in text-to-speech API:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500 })
  }
}