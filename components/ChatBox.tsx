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
      <div className="shrink-0 py-3 flex gap-2 bg-purple-50">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="How are you feeling?"
          disabled={isThinking}
          className="flex-1 px-4 py-2.5 rounded-full border border-purple-200 bg-white text-gray-700 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent disabled:opacity-50 transition-colors"
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
