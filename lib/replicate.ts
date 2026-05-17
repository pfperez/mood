// Re-enable Replicate TTS for production demo
//
// import Replicate from 'replicate'
//
// const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
//
// // Voice reference hosted in the public GitHub repo so Replicate's servers can fetch it
// const VOICE_REFERENCE_URL = 'https://raw.githubusercontent.com/pfperez/mood/main/public/reference/voice.wav'
//
// async function runWithRetry(prompt: string): Promise<unknown> {
//   const input = { prompt, audio_prompt: VOICE_REFERENCE_URL, exaggeration: 0.5, cfg: 0.5 }
//   const timeout = new Promise<never>((_, reject) =>
//     setTimeout(() => reject(new Error('Replicate timeout')), 30_000)
//   )
//   try {
//     return await Promise.race([replicate.run('resemble-ai/chatterbox', { input }), timeout])
//   } catch (err: unknown) {
//     const status = (err as { status?: number })?.status
//     if (status === 429) {
//       await new Promise((res) => setTimeout(res, 1_500))
//       return Promise.race([replicate.run('resemble-ai/chatterbox', { input }), timeout])
//     }
//     throw err
//   }
// }
//
// export async function generateSpeech(text: string): Promise<string | null> {
//   try {
//     const output = await runWithRetry(text)
//     if (!output) return null
//     return typeof output === 'string'
//       ? output
//       : (output as { url: () => URL }).url().toString()
//   } catch (err) {
//     console.error('Replicate TTS error:', err)
//     return null
//   }
// }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateSpeech(_text: string): Promise<string | null> {
  return null
}
