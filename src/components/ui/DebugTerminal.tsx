'use client'

import { useEffect, useRef, useState } from 'react'
import { useTerminalLogs, type TerminalLogEntry } from '@/lib/terminal-log-context'
import { cn } from '@/lib/utils'

const TYPE_COLORS: Record<TerminalLogEntry['type'], string> = {
  system: 'text-terminal-green',
  user: 'text-terminal-amber',
  ai: 'text-terminal-primary',
  error: 'text-terminal-red',
  info: 'text-terminal-dim',
  token: 'text-terminal-text/50',
}

const TYPE_PREFIX: Record<TerminalLogEntry['type'], string> = {
  system: '──',
  user: '>>>',
  ai: '<<<',
  error: '!!!',
  info: '---',
  token: '...',
}

export function DebugTerminal() {
  const { logs, clear } = useTerminalLogs()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const autoScrollRef = useRef(true)

  useEffect(() => {
    if (isOpen && autoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isOpen])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    autoScrollRef.current = atBottom
  }

  return (
    <>
      {/* 底部面板切换标签 */}
      <div className="h-8 bg-[#252526] border-t border-terminal-border flex items-center justify-between px-3 shrink-0">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="font-mono text-[10px] text-terminal-dim hover:text-terminal-text transition-colors flex items-center gap-1.5"
        >
          <span className="text-xs">{isOpen ? '▼' : '▲'}</span>
          <span>TERMINAL</span>
          <span className="text-terminal-dim/50">
            ({logs.length})
          </span>
        </button>
        <div className="flex items-center gap-2">
          {isOpen && (
            <button
              onClick={clear}
              className="font-mono text-[10px] text-terminal-dim hover:text-terminal-red transition-colors"
            >
              CLEAR
            </button>
          )}
          <span className="font-mono text-[10px] text-terminal-dim/40">
            DEBUG_OUTPUT
          </span>
        </div>
      </div>

      {/* 终端输出面板 */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out bg-[#1a1a1a]',
          isOpen ? 'h-48' : 'h-0'
        )}
      >
        <div
          onScroll={handleScroll}
          className="h-full overflow-y-auto px-3 py-1.5 terminal-scroll"
        >
          {logs.length === 0 ? (
            <div className="font-mono text-[10px] text-terminal-dim/30 py-1">
              {'//'} NO TERMINAL OUTPUT YET...
            </div>
          ) : (
            logs.map((entry) => (
              <div
                key={entry.id}
                className="font-mono text-[10px] leading-relaxed py-px flex gap-2 hover:bg-[#2a2a2a]/50"
              >
                {/* 时间戳 */}
                <span className="text-terminal-dim/30 shrink-0 select-none">
                  [{entry.timestamp}]
                </span>
                {/* 类型指示符 */}
                <span className={cn(
                  'shrink-0 select-none w-7 text-right',
                  TYPE_COLORS[entry.type]
                )}>
                  {TYPE_PREFIX[entry.type]}
                </span>
                {/* 内容 */}
                <span className={cn(
                  'flex-1 break-words whitespace-pre-wrap',
                  TYPE_COLORS[entry.type],
                  entry.type === 'token' && 'opacity-50'
                )}>
                  {entry.content}
                </span>
                {/* 对话 ID */}
                {entry.conversationId && (
                  <span className="text-terminal-dim/20 shrink-0 select-none">
                    #{entry.conversationId.slice(0, 6)}
                  </span>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </>
  )
}