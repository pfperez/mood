'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Message } from './ChatBox'

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

interface SidebarProps {
  conversations: Conversation[]
  activeId: string
  onSelect: (id: string) => void
  onCreate: () => void
  onRename: (id: string, currentTitle: string) => void
  onDelete: (id: string) => void
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  isOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname()
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  // Close the dropdown when clicking anywhere outside it
  useEffect(() => {
    if (!menuOpenId) return
    const close = () => setMenuOpenId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpenId])

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-64 flex flex-col',
          'bg-purple-100 border-r border-purple-200',
          'transition-transform duration-200 ease-in-out',
          'md:relative md:translate-x-0 md:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* New chat button */}
        <div className="p-3 pt-4 shrink-0">
          <button
            onClick={onCreate}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-purple-700 bg-white/60 hover:bg-white transition-colors"
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New chat
          </button>
        </div>

        {/* Conversation list */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {sorted.map((conv) => (
            <div
              key={conv.id}
              className={[
                'group relative flex items-center gap-1 rounded-lg px-3 py-2 cursor-pointer select-none',
                conv.id === activeId
                  ? 'bg-purple-200 text-purple-900'
                  : 'text-purple-800 hover:bg-purple-200/60',
              ].join(' ')}
              onClick={() => onSelect(conv.id)}
            >
              <span className="flex-1 text-sm truncate min-w-0">{conv.title}</span>

              {/* Three-dot menu trigger */}
              <button
                className={[
                  'shrink-0 p-0.5 rounded hover:bg-purple-300/60 transition-opacity',
                  menuOpenId === conv.id
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100',
                ].join(' ')}
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpenId(menuOpenId === conv.id ? null : conv.id)
                }}
                aria-label="Conversation options"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {menuOpenId === conv.id && (
                <div
                  className="absolute right-2 top-full mt-1 z-10 w-32 bg-white rounded-lg shadow-lg border border-gray-100 py-1 text-gray-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      onRename(conv.id, conv.title)
                      setMenuOpenId(null)
                    }}
                  >
                    Rename
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      onDelete(conv.id)
                      setMenuOpenId(null)
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Insights navigation */}
        <div className="shrink-0 border-t border-purple-200 p-2">
          <Link
            href="/insights"
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === '/insights'
                ? 'bg-purple-200 text-purple-900'
                : 'text-purple-800 hover:bg-purple-200/60',
            ].join(' ')}
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
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Insights
          </Link>
        </div>
      </aside>
    </>
  )
}
