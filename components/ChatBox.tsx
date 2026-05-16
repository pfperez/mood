'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'

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

export default function ChatBox({ messages, onSend, isThinking }: ChatBoxProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  const submit = () => {
    const text = input.trim()
    if (!text || isThinking) return
    onSend(text)
    setInput('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="w-full max-w-md flex flex-col px-4 pb-8" style={{ flex: '1 1 auto' }}>
      {/* Message list */}
      <div className="overflow-y-auto space-y-3 py-2 max-h-72 min-h-[8rem]">
        {messages.length === 0 && (
          <p className="text-center text-purple-300 text-sm mt-8">
            Say hello — I&apos;m here to listen.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="flex gap-2 mt-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="How are you feeling?"
          disabled={isThinking}
          className="flex-1 px-4 py-2.5 rounded-full border border-purple-200 bg-white text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:border-purple-400 disabled:opacity-50 transition-colors"
        />
        <button
          onClick={submit}
          disabled={isThinking || !input.trim()}
          className="px-5 py-2.5 bg-purple-300 text-purple-900 rounded-full text-sm font-medium hover:bg-purple-400 active:bg-purple-500 disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}
