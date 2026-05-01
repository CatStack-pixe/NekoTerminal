'use client'

import { ConversationList } from './ConversationList'
import type { Conversation } from '@/types'

interface SidebarProps {
  isOpen: boolean
  conversations: Conversation[]
  activeId?: string
  isLoading?: boolean
  onSelectConversation?: (conv: Conversation) => void
  onDeleteConversation?: (conv: Conversation) => void
  onNewConversation?: () => void
  onClose?: () => void
}

export function Sidebar({
  isOpen,
  conversations,
  activeId,
  isLoading,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
  onClose,
}: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:relative z-50 lg:z-0
          w-60 h-full
          bg-terminal-elevated border-r border-terminal-border
          transition-transform duration-200
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* 顶部标题 - VS Code 文件资源管理器风格 */}
        <div className="px-3 py-2 border-b border-terminal-border flex items-center justify-between">
          <h1 className="font-mono text-[11px] text-terminal-dim uppercase tracking-widest">
            EXPLORER
          </h1>
          <button
            onClick={onNewConversation}
            className="font-mono text-xs text-terminal-primary/60 hover:text-terminal-primary transition-colors"
            title="New file"
          >
            [+]
          </button>
        </div>

        {/* 对话列表 */}
        <div className="flex-1 overflow-y-auto py-1">
          <div className="px-3 py-1 font-mono text-[10px] text-terminal-dim/50 uppercase tracking-wider">
            CHANNELS
          </div>
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            isLoading={isLoading}
            onSelect={onSelectConversation}
            onDelete={onDeleteConversation}
          />
        </div>

        {/* 底部状态 */}
        <div className="px-3 py-2 border-t border-terminal-border">
          <div className="font-mono text-[10px] text-terminal-dim/50">
            {conversations.length} channel{conversations.length !== 1 ? 's' : ''}
          </div>
        </div>
      </aside>
    </>
  )
}