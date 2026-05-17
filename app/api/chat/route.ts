import { NextRequest, NextResponse } from 'next/server'
import { getCompanionResponse } from '@/lib/groq'
import { generateSpeech } from '@/lib/replicate'

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }

    const { sentiment, intensity, response } = await getCompanionResponse(
      message,
      history ?? []
    )

    const audioUrl = await generateSpeech(response)

    return NextResponse.json({ response, sentiment, intensity, audioUrl })
  } catch (err) {
    console.error('Chat API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
