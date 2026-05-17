'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Avatar from '@/components/Avatar'
import ChatBox, { Message } from '@/components/ChatBox'

const STORAGE_KEY = 'mood-history'
const MUTED_KEY = 'mood-muted'

const INTRO_MESSAGE: Message = {
  role: 'assistant',
  content: "Hi, I'm here. How are you feeling today?",
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isNew, setIsNew] = useState(true)
  const [isMuted, setIsMuted] = useState(false)

  const isMutedRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
          setIsNew(false)
        }
      } catch {}
    }
    const muted = localStorage.getItem(MUTED_KEY) === 'true'
    setIsMuted(muted)
    isMutedRef.current = muted
  }, [])

  // Set up the audio element and Web Audio AnalyserNode once
  useEffect(() => {
    const audio = new Audio()
    audio.crossOrigin = 'anonymous'
    audioRef.current = audio

    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    ctx.createMediaElementSource(audio).connect(analyser)
    analyser.connect(ctx.destination)
    audioCtxRef.current = ctx
    analyserRef.current = analyser

    audio.onplay  = () => setIsPlaying(true)
    audio.onended = () => setIsPlaying(false)
    audio.onerror = () => setIsPlaying(false)

    return () => {
      audio.pause()
      ctx.close()
    }
  }, [])

  // Persist messages whenever they change (skip during intro state)
  useEffect(() => {
    if (!isNew && messages.length > 0) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          messages.map(({ role, content, sentiment }) => ({ role, content, sentiment }))
        )
      )
    }
  }, [messages, isNew])

  // Persist mute state
  useEffect(() => {
    isMutedRef.current = isMuted
    localStorage.setItem(MUTED_KEY, String(isMuted))
  }, [isMuted])

  const playSound = useCallback((src: string) => {
    if (isMutedRef.current) return
    const audio = new Audio(src)
    audio.play().catch(() => {})
  }, [])

  const clearConversation = () => {
    if (window.confirm("Clear this conversation? This can't be undone.")) {
      localStorage.removeItem(STORAGE_KEY)
      setMessages([])
      setIsNew(true)
    }
  }

  const sendMessage = useCallback(
    async (text: string) => {
      const wasNew = isNew

      const historyBase: { role: 'user' | 'assistant'; content: string }[] = wasNew
        ? [{ role: 'assistant', content: INTRO_MESSAGE.content }]
        : []
      const history = [
        ...historyBase,
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ]

      setIsNew(false)
      setMessages((prev) => {
        const base = wasNew ? [INTRO_MESSAGE, ...prev] : prev
        return [...base, { role: 'user', content: text }]
      })
      setIsThinking(true)
      playSound('/sounds/send.mp3')

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
        playSound('/sounds/receive.mp3')

        if (data.audioUrl && audioRef.current) {
          if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume()
          audioRef.current.src = data.audioUrl
          audioRef.current.play().catch(console.error)
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
    [messages, isNew, playSound]
  )

  const displayMessages = isNew ? [INTRO_MESSAGE, ...messages] : messages

  return (
    <main className="flex flex-col h-dvh bg-purple-50 overflow-hidden">
      {/* Sticky header: title + avatar */}
      <header className="shrink-0 relative flex flex-col items-center pt-8 pb-2 px-4 bg-purple-50">
        {/* Top-right controls */}
        <div className="absolute top-4 right-4 flex items-center gap-3">
          <button
            onClick={() => setIsMuted((m) => !m)}
            title={isMuted ? 'Unmute sound effects' : 'Mute sound effects'}
            aria-label={isMuted ? 'Unmute sound effects' : 'Mute sound effects'}
            className="text-purple-300 hover:text-purple-500 transition-colors"
          >
            {isMuted ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
          {!isNew && (
            <button
              onClick={clearConversation}
              className="text-xs text-purple-300 hover:text-purple-500 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <h1 className="text-2xl font-light tracking-[0.3em] text-purple-400 uppercase mb-1">
          Mood
        </h1>
        {isNew && (
          <p className="text-purple-300 text-sm mb-2">An AI companion that listens</p>
        )}

        <Avatar isPlaying={isPlaying} analyserRef={analyserRef} />
      </header>

      {/* Chat area fills remaining viewport */}
      <ChatBox messages={displayMessages} onSend={sendMessage} isThinking={isThinking} />
    </main>
  )
}
