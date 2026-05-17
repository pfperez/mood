'use client'

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  sentiment?: string
}

interface ChatBoxProps {
  messages: Message[]
  onSend: (text: string) => void
  isThinking: boolean
}

// Resolve webkit-prefixed constructor so Chrome/Edge/iOS Safari all work
type SpeechRecognitionCtor = { new(): SpeechRecognition }
function getSpeechRecognition(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  return (
    (window as Window & { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
    (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition
  )
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start msg-enter-left">
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white shadow-sm flex gap-1.5 items-center">
        <span className="w-2 h-2 rounded-full bg-purple-300 thinking-dot" />
        <span className="w-2 h-2 rounded-full bg-purple-300 thinking-dot" />
        <span className="w-2 h-2 rounded-full bg-purple-300 thinking-dot" />
      </div>
    </div>
  )
}

function MicIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

export default function ChatBox({ messages, onSend, isThinking }: ChatBoxProps) {
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [micSupported, setMicSupported] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref tracks the latest transcript so onend closure sees the current value
  const transcriptRef = useRef('')

  useEffect(() => {
    setMicSupported(!!getSpeechRecognition())
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  // Submit the current input (or stop recognition first — onend will then submit)
  const submit = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      return
    }
    const text = input.trim()
    if (!text || isThinking) return
    onSend(text)
    setInput('')
  }, [input, isThinking, onSend])

  const toggleMic = useCallback(() => {
    // Toggle off
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const SpeechRecognitionAPI = getSpeechRecognition()
    if (!SpeechRecognitionAPI) return

    setMicError(null)
    transcriptRef.current = ''

    const rec = new SpeechRecognitionAPI()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = true

    rec.onstart = () => {
      setIsListening(true)
      // Start silence watchdog; reset on each result
      silenceTimerRef.current = setTimeout(() => rec.stop(), 1500)
    }

    rec.onresult = (e: SpeechRecognitionEvent) => {
      // Reset silence timer on every chunk of speech
      clearSilenceTimer()
      silenceTimerRef.current = setTimeout(() => rec.stop(), 1500)

      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('')
      transcriptRef.current = transcript
      setInput(transcript)
    }

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      clearSilenceTimer()
      if (e.error === 'not-allowed') {
        setMicError('Microphone access denied — enable in browser settings to use voice')
      }
      setIsListening(false)
      recognitionRef.current = null
    }

    rec.onend = () => {
      clearSilenceTimer()
      setIsListening(false)
      recognitionRef.current = null

      const text = transcriptRef.current.trim()
      transcriptRef.current = ''
      if (text) {
        onSend(text)
        setInput('')
      }
    }

    recognitionRef.current = rec
    try {
      rec.start()
    } catch {
      setIsListening(false)
      recognitionRef.current = null
    }
  }, [isListening, onSend, clearSilenceTimer])

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full max-w-md mx-auto px-4">
      {/* Scrollable message list */}
      <div className="flex-1 overflow-y-auto py-2 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === 'user'
                ? 'justify-end msg-enter-right'
                : 'justify-start msg-enter-left'
            }`}
          >
            <div
              className={`px-4 py-2.5 rounded-2xl max-w-[78%] text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-purple-200 text-purple-900 rounded-br-sm'
                  : 'bg-white text-gray-700 shadow-sm rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isThinking && <ThinkingBubble />}
        <div ref={bottomRef} />
      </div>

      {/* Input row — always anchored at the bottom */}
      <div className="shrink-0 py-3 flex flex-col gap-1 bg-purple-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isListening ? 'Listening…' : 'How are you feeling?'}
            disabled={isThinking}
            className="flex-1 px-4 py-2.5 rounded-full border border-purple-200 bg-white text-gray-700 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent disabled:opacity-50 transition-colors"
          />

          {micSupported && (
            <button
              onClick={toggleMic}
              disabled={isThinking}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              title={isListening ? 'Stop listening' : 'Use voice input'}
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 ${
                isListening
                  ? 'bg-red-400 text-white border border-red-400 animate-pulse'
                  : 'border border-purple-200 text-purple-400 hover:border-purple-400 hover:text-purple-600'
              }`}
            >
              <MicIcon />
            </button>
          )}

          <button
            onClick={submit}
            disabled={isThinking || !input.trim()}
            className="px-5 py-2.5 bg-purple-300 text-purple-900 rounded-full text-sm font-medium hover:bg-purple-400 active:bg-purple-500 disabled:opacity-40 transition-colors"
          >
            Send
          </button>
        </div>

        {micError && (
          <p className="text-xs text-red-400 px-2">{micError}</p>
        )}
      </div>
    </div>
  )
}
