'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import Sidebar, { Conversation } from '@/components/Sidebar'

const CONVERSATIONS_KEY = 'mood-conversations'
const ACTIVE_KEY = 'mood-active-conversation'

// Sentiment → numeric mood score
const SENTIMENT_SCORES: Record<string, number> = {
  happy: 1, excited: 1, grateful: 1, calm: 1, joyful: 1, love: 1, blissful: 1, hopeful: 1,
  content: 0, neutral: 0, okay: 0, fine: 0, indifferent: 0,
  anxious: -0.5, stressed: -0.5, tired: -0.5, worried: -0.5, overwhelmed: -0.5,
  melancholy: -0.5, uncertain: -0.5, conflicted: -0.5, bored: -0.5,
  sad: -1, angry: -1, frustrated: -1, lonely: -1, depressed: -1, upset: -1,
  devastated: -1, hopeless: -1, numb: -1,
}

function sentimentToScore(s: string): number {
  return SENTIMENT_SCORES[s.toLowerCase()] ?? 0
}

function sentimentChipClass(s: string | undefined): string {
  if (!s) return 'bg-gray-100 text-gray-500'
  const score = sentimentToScore(s)
  if (score >= 1) return 'bg-green-100 text-green-700'
  if (score > 0) return 'bg-emerald-100 text-emerald-700'
  if (score === 0) return 'bg-gray-100 text-gray-600'
  if (score >= -0.5) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

interface TimelinePoint {
  dateStr: string
  score: number | null
}

interface DistributionEntry {
  sentiment: string
  count: number
}

interface Stats {
  totalConversations: number
  totalUserMessages: number
  daysActive: number
  mostCommonSentiment: string
}

interface Reflection {
  text: string
  sentiment?: string
}

interface InsightsData {
  hasData: boolean
  timelineData: TimelinePoint[]
  distributionData: DistributionEntry[]
  stats: Stats | null
  recentReflections: Reflection[]
}

function computeInsights(conversations: Conversation[]): InsightsData {
  const hasData = conversations.some((c) =>
    c.messages.some((m) => m.role === 'assistant' && m.sentiment)
  )

  if (!hasData) {
    return { hasData: false, timelineData: [], distributionData: [], stats: null, recentReflections: [] }
  }

  const dayScores: Record<string, number[]> = {}
  const sentimentCounts: Record<string, number> = {}

  for (const conv of conversations) {
    const dateStr = new Date(conv.updatedAt).toISOString().slice(0, 10)
    for (const msg of conv.messages) {
      if (msg.role === 'assistant' && msg.sentiment) {
        const s = msg.sentiment.toLowerCase()
        const score = sentimentToScore(s)
        dayScores[dateStr] = dayScores[dateStr] ?? []
        dayScores[dateStr].push(score)
        sentimentCounts[s] = (sentimentCounts[s] ?? 0) + 1
      }
    }
  }

  // Last 30 days, anchored to local midnight
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const timelineData: TimelinePoint[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (29 - i))
    const dateStr = d.toISOString().slice(0, 10)
    const scores = dayScores[dateStr]
    const score = scores
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
      : null
    return { dateStr, score }
  })

  const distributionData: DistributionEntry[] = Object.entries(sentimentCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([sentiment, count]) => ({ sentiment, count }))

  const totalConversations = conversations.filter((c) => c.messages.length > 0).length
  const totalUserMessages = conversations.reduce(
    (sum, c) => sum + c.messages.filter((m) => m.role === 'user').length,
    0
  )
  const daysActive = new Set(
    conversations
      .filter((c) => c.messages.length > 0)
      .map((c) => new Date(c.updatedAt).toISOString().slice(0, 10))
  ).size
  const mostCommonSentiment = distributionData[0]?.sentiment ?? '—'

  const allReflections: (Reflection & { date: number })[] = []
  for (const conv of conversations) {
    for (let i = 0; i < conv.messages.length; i++) {
      const msg = conv.messages[i]
      if (msg.role === 'user') {
        const next = conv.messages[i + 1]
        allReflections.push({
          text: msg.content,
          sentiment: next?.role === 'assistant' ? next.sentiment : undefined,
          date: conv.updatedAt,
        })
      }
    }
  }
  allReflections.sort((a, b) => b.date - a.date)

  return {
    hasData: true,
    timelineData,
    distributionData,
    stats: { totalConversations, totalUserMessages, daysActive, mostCommonSentiment },
    recentReflections: allReflections.slice(0, 5).map(({ text, sentiment }) => ({ text, sentiment })),
  }
}

// ── Shared card wrapper ────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-base font-medium text-purple-800 mb-4">{title}</h2>
      {children}
    </div>
  )
}

// ── Chart 1: Sentiment timeline ────────────────────────────────────────────────

function TimelineChart({ data }: { data: TimelinePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" vertical={false} />
        <XAxis
          dataKey="dateStr"
          tick={{ fontSize: 10, fill: '#c4b5fd' }}
          tickLine={false}
          axisLine={false}
          interval={0}
          tickFormatter={(v, i) =>
            i % 9 === 0 || i === 29
              ? new Date(v + 'T12:00:00').toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              : ''
          }
        />
        <YAxis
          domain={[-1, 1]}
          ticks={[-1, 0, 1]}
          tick={{ fontSize: 10, fill: '#c4b5fd' }}
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(v) =>
            v === 1 ? 'Positive' : v === 0 ? 'Neutral' : 'Negative'
          }
        />
        <ReferenceLine y={0} stroke="#e9d5ff" strokeDasharray="4 2" />
        <Tooltip
          contentStyle={{
            background: 'white',
            border: '1px solid #ede9fe',
            borderRadius: 10,
            fontSize: 12,
          }}
          labelFormatter={(label) =>
            new Date(label + 'T12:00:00').toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })
          }
          formatter={(value) => [
            value != null ? Number(value).toFixed(2) : 'No data',
            'Mood score',
          ]}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ fill: '#8b5cf6', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#7c3aed' }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Chart 2: Sentiment distribution ───────────────────────────────────────────

function DistributionChart({ data }: { data: DistributionEntry[] }) {
  const height = Math.max(120, data.length * 36)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
      >
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: '#c4b5fd' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="sentiment"
          width={82}
          tick={{ fontSize: 11, fill: '#7c3aed' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: 'white',
            border: '1px solid #ede9fe',
            borderRadius: 10,
            fontSize: 12,
          }}
          cursor={{ fill: '#ede9fe' }}
          formatter={(value) => [value, 'times']}
        />
        <Bar dataKey="count" fill="#a78bfa" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Chart 3: Quick stats ───────────────────────────────────────────────────────

function StatCards({ stats }: { stats: Stats }) {
  const items = [
    { value: stats.totalConversations, label: 'Conversations' },
    { value: stats.totalUserMessages, label: 'Messages sent' },
    { value: stats.daysActive, label: 'Days active' },
    { value: stats.mostCommonSentiment, label: 'Most common feeling', small: true },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {items.map(({ value, label, small }) => (
        <div key={label} className="bg-purple-50 rounded-xl p-4 flex flex-col justify-between">
          <span
            className={
              small
                ? 'text-lg font-medium text-purple-600 capitalize'
                : 'text-3xl font-light text-purple-600'
            }
          >
            {value}
          </span>
          <span className="text-xs text-purple-400 uppercase tracking-wide mt-1">{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Chart 4: Recent reflections ────────────────────────────────────────────────

function RecentReflections({ items }: { items: Reflection[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-purple-300">No messages yet.</p>
  }
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <p className="flex-1 text-sm text-gray-600 leading-relaxed">{item.text}</p>
          {item.sentiment && (
            <span
              className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${sentimentChipClass(item.sentiment)}`}
            >
              {item.sentiment}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-12 h-12 text-purple-200 mb-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
      <p className="text-purple-400 text-base mb-1">No insights yet.</p>
      <p className="text-purple-300 text-sm mb-6">
        Have a few conversations and come back to see your patterns.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 bg-purple-300 text-purple-900 rounded-full text-sm font-medium hover:bg-purple-400 transition-colors"
      >
        Start a conversation
      </Link>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(CONVERSATIONS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) setConversations(parsed)
      }
    } catch {}
    try {
      const aid = localStorage.getItem(ACTIVE_KEY)
      if (aid) setActiveId(aid)
    } catch {}
  }, [])

  // On insights page, selecting a conversation navigates back to chat
  const handleSelect = useCallback(
    (id: string) => {
      localStorage.setItem(ACTIVE_KEY, id)
      router.push('/')
    },
    [router]
  )

  const handleCreate = useCallback(() => {
    router.push('/')
  }, [router])

  const handleRename = useCallback((id: string, currentTitle: string) => {
    const newTitle = window.prompt('Rename conversation:', currentTitle)
    if (!newTitle?.trim()) return
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === id ? { ...c, title: newTitle.trim() } : c
      )
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm("Delete this conversation? This can't be undone.")) return
      const remaining = conversations.filter((c) => c.id !== id)
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(remaining))
      setConversations(remaining)
      if (id === activeId && remaining.length > 0) {
        const next = [...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0]
        setActiveId(next.id)
        localStorage.setItem(ACTIVE_KEY, next.id)
      }
    },
    [conversations, activeId]
  )

  const insights = useMemo(() => computeInsights(conversations), [conversations])

  if (!mounted) return null

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

      <main className="flex-1 overflow-y-auto bg-purple-50">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {/* Page header */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              {/* Hamburger — mobile only */}
              <button
                className="md:hidden text-purple-300 hover:text-purple-500 transition-colors"
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
              <Link
                href="/"
                className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-600 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to chat
              </Link>
            </div>
            <h1 className="text-3xl font-light text-purple-400 tracking-wide">Your Insights</h1>
            <p className="text-purple-300 text-sm mt-1">How you&apos;ve been feeling lately</p>
          </div>

          {!insights.hasData ? (
            <EmptyState />
          ) : (
            <>
              {/* Sentiment over time */}
              <Card title="Mood over time — last 30 days">
                <TimelineChart data={insights.timelineData} />
              </Card>

              {/* Distribution + Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Feelings breakdown">
                  <DistributionChart data={insights.distributionData} />
                </Card>
                <Card title="At a glance">
                  {insights.stats && <StatCards stats={insights.stats} />}
                </Card>
              </div>

              {/* Recent reflections */}
              <Card title="Recent reflections">
                <RecentReflections items={insights.recentReflections} />
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
