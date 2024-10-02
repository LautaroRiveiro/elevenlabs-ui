// app/api/check-api-key/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY
  return NextResponse.json({ isSet: !!apiKey })
}