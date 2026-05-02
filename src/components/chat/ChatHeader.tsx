'use client'

interface ChatHeaderProps {
  title?: string
  onToggleSidebar?: () => void
  onOpenConfig?: () => void
  onSignOut?: () => void
}

export function ChatHeader({ title, onToggleSidebar, onOpenConfig, onSignOut }: ChatHeaderProps) {
  return (
    <div className="h-8 flex items-center justify-between px-3 border-b border-terminal-border bg-terminal-elevated shrink-0">
      {/* 左侧：汉堡按钮 + 路径 */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="font-mono text-xs text-terminal-primary/70 hover:text-terminal-primary transition-all duration-200 shrink-0 hover:scale-110 active:scale-95"
          title="Toggle sidebar"
        >
          ☰
        </button>
        <span className="font-mono text-xs text-terminal-dim/60">{'>>'}</span>
        <h2 className="font-mono text-xs text-terminal-text/80 truncate max-w-[60vw]">
          {title || '[UNTITLED_CHANNEL]'}
        </h2>
      </div>

      {/* 右侧 */}
      <div className="flex items-center gap-1 shrink-0">
        {onOpenConfig && (
          <button
            onClick={onOpenConfig}
            className="font-mono text-[10px] text-terminal-dim hover:text-terminal-text transition-colors px-2"
          >
            SETTINGS
          </button>
        )}
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="font-mono text-[10px] text-terminal-dim hover:text-terminal-red transition-colors px-2"
          >
            SIGNOUT
          </button>
        )}
      </div>
    </div>
  )
}