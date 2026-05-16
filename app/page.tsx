'use client'

import { useState, useCallback, useRef } from 'react'
import Avatar from '@/components/Avatar'
import ChatBox, { Message } from '@/components/ChatBox'

function pickFemaleVoice(): Promise<SpeechSynthesisVoice | null> {
  return new Promise((resolve) => {
    const pick = (voices: SpeechSynthesisVoice[]) => {
      const en = voices.filter((v) => v.lang.startsWith('en'))
      return (
        en.find((v) => v.name === 'Samantha') ??         // Mac/Safari (same as Siri)
        en.find((v) => /female/i.test(v.name)) ??        // some Windows voices label this
        en.find((v) => v.name.includes('(f)') || v.name.includes('_f')) ??
        en[0] ??                                          // first English voice as last resort
        null
      )
    }
    const voices = window.speechSynthesis.getVoices()
    if (voices.length) return resolve(pick(voices))
    window.speechSynthesis.onvoiceschanged = () =>
      resolve(pick(window.speechSynthesis.getVoices()))
  })
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sendMessage = useCallback(
    async (text: string) => {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      setMessages((prev) => [...prev, { role: 'user', content: text }])
      setIsThinking(true)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history }),
        })

        if (!res.ok) throw new Error('API error')
        const data = await res.json()

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.response, sentiment: data.sentiment },
        ])

        // Speak using the browser's built-in speech engine (free, no API needed)
        if (data.response && typeof window !== 'undefined') {
          window.speechSynthesis.cancel()
          if (endTimerRef.current) clearTimeout(endTimerRef.current)

          const utterance = new SpeechSynthesisUtterance(data.response)
          const voice = await pickFemaleVoice()
          if (voice) utterance.voice = voice

          // Estimate duration so the animation stops even if onend never fires (Safari bug)
          const words = data.response.trim().split(/\s+/).length
          const estimatedMs = Math.max(800, (words / 2.8) * 1000)

          const onDone = () => {
            if (endTimerRef.current) clearTimeout(endTimerRef.current)
            setIsPlaying(false)
          }

          utterance.onstart = () => {
            setIsPlaying(true)
            endTimerRef.current = setTimeout(onDone, estimatedMs)
          }
          utterance.onend = onDone
          utterance.onerror = onDone

          window.speechSynthesis.speak(utterance)
        }
      } catch (err) {
        console.error(err)
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Something went wrong — please try again.' },
        ])
      } finally {
        setIsThinking(false)
      }
    },
    [messages]
  )

  return (
    <main className="min-h-screen bg-purple-50 flex flex-col items-center">
      <h1 className="text-2xl font-light tracking-[0.3em] text-purple-400 mt-10 mb-6 uppercase">
        Mood
      </h1>

      <Avatar isPlaying={isPlaying} />

      <div className="h-7 flex items-center mt-1">
        {isThinking && (
          <span className="text-purple-300 text-sm animate-pulse">thinking...</span>
        )}
      </div>

      <ChatBox messages={messages} onSend={sendMessage} isThinking={isThinking} />
    </main>
  )
}
