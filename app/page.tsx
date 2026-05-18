'use client'

import { useState, useCallback, useEffect } from 'react'
import Avatar from '@/components/Avatar'
import ChatBox, { Message } from '@/components/ChatBox'
import Sidebar, { Conversation } from '@/components/Sidebar'

const CONVERSATIONS_KEY = 'mood-conversations'
const ACTIVE_KEY = 'mood-active-conversation'
const MUTED_KEY = 'mood-muted'

const INTRO_MESSAGE: Message = {
  role: 'assistant',
  content: "Hi, I'm here. How are you feeling today?",
}

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function createConversation(): Conversation {
  return { id: genId(), title: 'New chat', messages: [], createdAt: Date.now(), updatedAt: Date.now() }
}

export default function Page() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const isMutedRef = useRef(false)

  // Derived state
  const activeConversation = conversations.find((c) => c.id === activeId)
  const messages = activeConversation?.messages ?? []
  const isNew = messages.length === 0

  // Hydrate from localStorage on mount
  useEffect(() => {
    let convs: Conversation[] = []
    let aid = ''

    try {
      const stored = localStorage.getItem(CONVERSATIONS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) convs = parsed
      }
    } catch {}

    if (convs.length === 0) {
      const fresh = createConversation()
      convs = [fresh]
      aid = fresh.id
    } else {
      const storedActive = localStorage.getItem(ACTIVE_KEY)
      const found = storedActive ? convs.find((c) => c.id === storedActive) : null
      aid = found ? storedActive! : [...convs].sort((a, b) => b.updatedAt - a.updatedAt)[0].id
    }

    setConversations(convs)
    setActiveId(aid)

    const muted = localStorage.getItem(MUTED_KEY) === 'true'
    setIsMuted(muted)
    isMutedRef.current = muted

    setHydrated(true)
  }, [])

  // Persist conversations whenever they change
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(
      CONVERSATIONS_KEY,
      JSON.stringify(
        conversations.map((c) => ({
          ...c,
          messages: c.messages.map(({ role, content, sentiment }) => ({ role, content, sentiment })),
        }))
      )
    )
  }, [conversations, hydrated])

  // Persist active conversation ID
  useEffect(() => {
    if (!hydrated || !activeId) return
    localStorage.setItem(ACTIVE_KEY, activeId)
  }, [activeId, hydrated])

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

  // Conversation management
  const handleCreate = useCallback(() => {
    const fresh = createConversation()
    setConversations((prev) => [fresh, ...prev])
    setActiveId(fresh.id)
    setSidebarOpen(false)
  }, [])

  const handleSelect = useCallback((id: string) => {
    setActiveId(id)
    setSidebarOpen(false)
  }, [])

  const handleRename = useCallback((id: string, currentTitle: string) => {
    const newTitle = window.prompt('Rename conversation:', currentTitle)
    if (!newTitle || newTitle.trim() === '') return
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle.trim() } : c))
    )
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm("Delete this conversation? This can't be undone.")) return
      const remaining = conversations.filter((c) => c.id !== id)
      if (remaining.length === 0) {
        const fresh = createConversation()
        setConversations([fresh])
        setActiveId(fresh.id)
        return
      }
      setConversations(remaining)
      if (id === activeId) {
        setActiveId([...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0].id)
      }
    },
    [conversations, activeId]
  )

  const clearConversation = useCallback(() => {
    if (!window.confirm("Clear this chat? This can't be undone.")) return
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, messages: [], updatedAt: Date.now() } : c
      )
    )
  }, [activeId])

  function pickFemaleVoice(): SpeechSynthesisVoice | null {
    const voices = speechSynthesis.getVoices()
    const preferred = ['Samantha', 'Victoria', 'Karen', 'Allison', 'Ava']
    for (const name of preferred) {
      const match = voices.find((v) => v.name.includes(name))
      if (match) return match
    }
    return voices.find((v) => v.name.toLowerCase().includes('female')) ?? null
  }

  const speakResponse = useCallback((text: string) => {
    speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    const voice = pickFemaleVoice()
    if (voice) utt.voice = voice
    utt.rate = 1.0
    utt.pitch = 1.0
    utt.onstart = () => setIsPlaying(true)
    utt.onend = () => setIsPlaying(false)
    utt.onerror = () => setIsPlaying(false)
    speechSynthesis.speak(utt)
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      const conv = conversations.find((c) => c.id === activeId)
      if (!conv) return

      const currentMessages = conv.messages
      const wasNew = currentMessages.length === 0

      const historyBase: { role: 'user' | 'assistant'; content: string }[] = wasNew
        ? [{ role: 'assistant', content: INTRO_MESSAGE.content }]
        : []
      const history = [
        ...historyBase,
        ...currentMessages.map((m) => ({ role: m.role, content: m.content })),
      ].slice(-20)

      const userMessage: Message = { role: 'user', content: text }
      const newMessages: Message[] = wasNew
        ? [INTRO_MESSAGE, userMessage]
        : [...currentMessages, userMessage]

      // Auto-title from first message (only if still using the default title)
      const newTitle =
        wasNew && conv.title === 'New chat'
          ? text.trim().slice(0, 30).trimEnd()
          : conv.title

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? { ...c, messages: newMessages, title: newTitle, updatedAt: Date.now() }
            : c
        )
      )
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

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    { role: 'assistant' as const, content: data.response, sentiment: data.sentiment },
                  ],
                  updatedAt: Date.now(),
                }
              : c
          )
        )
        playSound('/sounds/receive.mp3')
        speakResponse(data.response)
      } catch (err) {
        console.error(err)
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    { role: 'assistant' as const, content: 'Something went wrong — please try again.' },
                  ],
                  updatedAt: Date.now(),
                }
              : c
          )
        )
      } finally {
        setIsThinking(false)
      }
    },
    [conversations, activeId, playSound, speakResponse]
  )

  const displayMessages = isNew ? [INTRO_MESSAGE] : messages

  if (!hydrated) return null

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onRename={handleRename}
        onDelete={handleDelete}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex flex-col flex-1 min-h-0 bg-purple-50 overflow-hidden">
        {/* Sticky header: title + avatar */}
        <header className="shrink-0 relative flex flex-col items-center pt-8 pb-2 px-4">
          {/* Hamburger — mobile only */}
          <button
            className="absolute top-4 left-4 md:hidden text-purple-300 hover:text-purple-500 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

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

          <Avatar isPlaying={isPlaying} />
        </header>

        {/* Chat area fills remaining viewport */}
        <ChatBox messages={displayMessages} onSend={sendMessage} isThinking={isThinking} />
      </main>
    </div>
  )
}
