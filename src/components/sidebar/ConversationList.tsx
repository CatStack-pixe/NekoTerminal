'use client'

import { ConversationItem } from './ConversationItem'
import { Spinner } from '@/components/ui/Spinner'
import type { Conversation } from '@/types'

interface ConversationListProps {
  conversations: Conversation[]
  activeId?: string
  isLoading?: boolean
  onSelect?: (conv: Conversation) => void
  onDelete?: (conv: Conversation) => void
}

export function ConversationList({
  conversations,
  activeId,
  isLoading,
  onSelect,
  onDelete,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner size="sm" />
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="px-3 py-4">
        <p className="font-mono text-[10px] text-terminal-dim/40">
          {'//'} NO CHANNELS
        </p>
      </div>
    )
  }

  return (
    <>
      {conversations.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isActive={conv.id === activeId}
          onClick={() => onSelect?.(conv)}
          onDelete={() => onDelete?.(conv)}
        />
      ))}
    </>
  )
}