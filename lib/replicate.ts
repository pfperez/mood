import Replicate from 'replicate'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

export async function generateSpeech(text: string): Promise<string | null> {
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Replicate timeout')), 30_000)
    )
    const output = await Promise.race([
      replicate.run('resemble-ai/chatterbox', { input: { text } }),
      timeout,
    ])
    if (!output) return null
    // Replicate returns a URL string or a FileOutput object depending on SDK version
    return typeof output === 'string'
      ? output
      : (output as { url: () => URL }).url().toString()
  } catch (err) {
    console.error('Replicate TTS error:', err)
    return null
  }
}
