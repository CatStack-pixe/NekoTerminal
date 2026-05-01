'use client'

interface ChatHeaderProps {
  title?: string
  onToggleSidebar?: () => void
  onOpenConfig?: () => void
}

export function ChatHeader({ title, onToggleSidebar, onOpenConfig }: ChatHeaderProps) {
  return (
    <div className="h-8 flex items-center justify-between px-3 border-b border-terminal-border bg-terminal-elevated shrink-0">
      {/* 左侧：文件路径风格 */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-xs text-terminal-dim/60">{'>>'}</span>
        <h2 className="font-mono text-xs text-terminal-text/80 truncate max-w-[60vw]">
          {title || '[UNTITLED_CHANNEL]'}
        </h2>
      </div>

      {/* 右侧 */}
      {onOpenConfig && (
        <button
          onClick={onOpenConfig}
          className="font-mono text-[10px] text-terminal-dim hover:text-terminal-text transition-colors px-2 shrink-0"
        >
          SETTINGS
        </button>
      )}
    </div>
  )
}