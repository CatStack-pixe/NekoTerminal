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
  onOpen?: () => void
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
  onOpen,
}: SidebarProps) {
  return (
    <>
      {/* 移动端蒙层 — 毛玻璃效果 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* 收起状态时左侧边缘指示条（桌面端） */}
      {!isOpen && (
        <button
          onClick={onOpen}
          className="hidden lg:flex fixed left-0 top-0 h-full w-[10px] z-30 flex-col items-center justify-center
                     bg-[#252526]/40 backdrop-blur-sm
                     hover:bg-[#252526]/80 hover:w-[12px]
                     group transition-all duration-200 ease-in-out cursor-pointer"
          title="Open sidebar"
        >
          <span className="text-terminal-primary/50 group-hover:text-terminal-primary group-hover:scale-125 transition-all duration-200 text-[10px]">
            ▶
          </span>
          {/* 光晕指示线 */}
          <span className="absolute left-0 top-0 w-[2px] h-full bg-gradient-to-b from-transparent via-terminal-primary/20 to-transparent
                         group-hover:via-terminal-primary/40 transition-all duration-300" />
        </button>
      )}

      {/* 侧边栏主体 */}
      <aside
        className={`
          fixed lg:relative z-50 lg:z-0
          w-60 h-full
          bg-[#252526]/80 backdrop-blur-xl
          border-r border-terminal-border/60
          transition-all duration-300 ease-in-out
          flex flex-col overflow-hidden
          ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0 opacity-0 lg:opacity-100'}
          ${isOpen ? 'lg:translate-x-0 lg:w-60' : 'lg:w-0 lg:border-r-0 lg:overflow-hidden'}
        `}
      >
        {/* 顶部标题 - VS Code 文件资源管理器风格 */}
        <div className="px-3 py-2 border-b border-terminal-border/60 flex items-center justify-between shrink-0">
          <h1 className="font-mono text-[11px] text-terminal-dim uppercase tracking-widest">
            EXPLORER
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={onNewConversation}
              className="font-mono text-xs text-terminal-primary/60 hover:text-terminal-primary transition-colors"
              title="New file"
            >
              [+]
            </button>
            {/* 桌面端收起按钮 */}
            <button
              onClick={onClose}
              className="hidden lg:flex font-mono text-[10px] text-terminal-dim/50 hover:text-terminal-primary transition-all duration-200 ml-2 hover:scale-110"
              title="Collapse sidebar"
            >
              ◀
            </button>
          </div>
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
        <div className="px-3 py-2 border-t border-terminal-border/60 shrink-0">
          <div className="font-mono text-[10px] text-terminal-dim/50">
            {conversations.length} channel{conversations.length !== 1 ? 's' : ''}
          </div>
        </div>
      </aside>
    </>
  )
}