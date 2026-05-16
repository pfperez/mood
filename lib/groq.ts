import Groq from 'groq-sdk'

const client = new Groq()

const SYSTEM_PROMPT = `You are Mood, a warm and caring AI companion. You listen deeply and respond with genuine empathy.

You MUST respond with a raw JSON object — no markdown, no code fences, no extra text.
Use exactly this structure:
{"sentiment": "<detected emotion>", "intensity": "<low|medium|high>", "response": "<your response>"}

Tone guidelines:
- Sad or struggling: gentle warmth and validation — never rush to fix
- Excited or happy: match their energy with genuine enthusiasm
- Anxious or worried: calm, grounding reassurance
- Angry or frustrated: acknowledge and validate without inflaming
- Neutral: friendly, warm, and curious

Rules:
- Keep every response to 2–3 sentences maximum
- Be human and present, never clinical or distant
- Never describe yourself as a therapist, counselor, or mental health professional
- If the user expresses thoughts of self-harm or suicide: respond with deep care, then include exactly: "If you're in crisis, you can reach the 988 Suicide & Crisis Lifeline by calling or texting 988."
- Output ONLY the raw JSON object. No markdown, no code fences, no extra text.`

export interface CompanionResponse {
  sentiment: string
  intensity: 'low' | 'medium' | 'high'
  response: string
}

export async function getCompanionResponse(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<CompanionResponse> {
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    response_format: { type: 'json_object' },
    max_tokens: 256,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: message },
    ],
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'

  // Strip markdown code fences in case the model wraps its output despite instructions
  const text = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/, '')
    .trim()

  try {
    const parsed = JSON.parse(text)
    return {
      sentiment: parsed.sentiment ?? 'neutral',
      intensity: parsed.intensity ?? 'low',
      response: parsed.response ?? 'I hear you.',
    }
  } catch {
    return { sentiment: 'neutral', intensity: 'low', response: raw }
  }
}
