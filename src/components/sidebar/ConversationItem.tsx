'use client'

import { cn } from '@/lib/utils'
import type { Conversation } from '@/types'
import { formatDate } from '@/lib/utils'

interface ConversationItemProps {
  conversation: Conversation
  isActive?: boolean
  onClick?: () => void
  onDelete?: () => void
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
  onDelete,
}: ConversationItemProps) {
  return (
    <div
      onClick={onClick}
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
          <div className="truncate">
            {conversation.title || '[new]'}
          </div>
          <div className="text-[10px] text-terminal-dim/40">
            {formatDate(conversation.updated_at)}
          </div>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete?.()
        }}
        className="opacity-0 group-hover:opacity-100 text-[10px] text-terminal-dim hover:text-terminal-red transition-colors px-1"
      >
        ✕
      </button>
    </div>
  )
}