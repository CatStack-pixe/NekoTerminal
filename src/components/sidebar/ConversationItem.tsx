'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types'
import { formatDate } from '@/lib/utils'

interface ConversationItemProps {
  conversation: Conversation
  isActive?: boolean
  onClick?: () => void
  onDelete?: () => void
  onRename?: (title: string) => void
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
  onDelete,
  onRename,
}: ConversationItemProps) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(conversation.title || '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!onRename) return
    e.stopPropagation()
    setEditTitle(conversation.title || '')
    setEditing(true)
  }

  const confirmRename = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== conversation.title) {
      onRename?.(trimmed)
    }
    setEditing(false)
  }

  const cancelRename = () => {
    setEditing(false)
  }

  return (
    <div
      onClick={editing ? undefined : onClick}
      onDoubleClick={handleDoubleClick}
      className={cn(
        'group flex items-center justify-between px-3 py-1.5 cursor-pointer transition-colors duration-100',
        'font-mono text-xs',
        isActive
          ? 'bg-terminal-primary/10 text-terminal-text'
          : 'text-terminal-dim hover:bg-white/5 hover:text-terminal-text'
      )}
    >
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <span className="text-[10px] text-terminal-dim/40 shrink-0">📄</span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={confirmRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename()
                if (e.key === 'Escape') cancelRename()
                e.stopPropagation()
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-[#3c3c3c] text-terminal-text text-xs font-mono outline-none border border-terminal-primary/30 px-1 py-0.5 rounded"
            />
          ) : (
            <>
              <div className="truncate">
                {conversation.title || '[new]'}
              </div>
              <div className="text-[10px] text-terminal-dim/40">
                {formatDate(conversation.updated_at)}
              </div>
            </>
          )}
        </div>
      </div>

      {!editing && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete?.()
          }}
          className="opacity-0 group-hover:opacity-100 text-[10px] text-terminal-dim hover:text-terminal-red transition-colors px-1"
        >
          ✕
        </button>
      )}
    </div>
  )
}
