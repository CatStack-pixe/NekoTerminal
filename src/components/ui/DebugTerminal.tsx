'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useTerminalLogs, type TerminalLogEntry } from '@/lib/terminal-log-context'

// ========== 类型 → 日志级别标签映射 (MC 控制台风格) ==========
const TYPE_LABELS: Record<string, string> = {
  system: 'INFO',
  user: 'INFO',
  ai: 'INFO',
  error: 'ERROR',
  info: 'INFO',
  token: 'DEBUG',
  network: 'DEBUG',
  db: 'DEBUG',
  perf: 'DEBUG',
  warn: 'WARN',
  debug: 'DEBUG',
  key: 'INFO',
}

// ========== 开发者模式：仅显示这些类型的日志 ==========
const DEV_TYPES = new Set(['info', 'error', 'warn', 'debug', 'network', 'db', 'perf', 'key', 'system'])

// ========== 标签颜色映射 (MC 控制台风格) ==========
const LABEL_COLORS: Record<string, string> = {
  INFO: 'text-gray-300',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-gray-500',
}

// ========== 日志行组件 ==========
function TerminalLogLine({ entry }: { entry: TerminalLogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const label = TYPE_LABELS[entry.type] ?? 'INFO'

  return (
    <div
      className={cn(
        'group flex items-start gap-1.5 py-0.5 font-mono text-xs leading-relaxed cursor-pointer hover:bg-white/5 px-2',
        LABEL_COLORS[label] ?? 'text-gray-300'
      )}
      onClick={() => entry.meta && setExpanded(!expanded)}
    >
      {/* 时间戳 */}
      <span className="text-gray-600 shrink-0 select-none text-[10px] pt-px">
        {entry.timestamp}
      </span>
      {/* 类型标签 */}
      <span
        className={cn(
          'shrink-0 select-none font-bold text-[10px]',
          LABEL_COLORS[label]
        )}
      >
        [{label}]
      </span>
      {/* 内容 */}
      <span className="flex-1 break-words whitespace-pre-wrap">
        {entry.content}
      </span>
      {/* 会话 ID 短码 */}
      {entry.conversationId && (
        <span className="text-gray-700 shrink-0 select-none text-[10px]">
          #{entry.conversationId.slice(0, 6)}
        </span>
      )}
      {/* meta 展开指示 */}
      {entry.meta && (
        <span className="text-gray-600 shrink-0 select-none text-[10px]">
          {expanded ? '▼' : '▶'}
        </span>
      )}
      {/* 展开的 meta 数据 */}
      {expanded && entry.meta && (
        <div className="w-full pl-14 text-[10px] text-gray-500 whitespace-pre-wrap font-mono mt-0.5 border-l border-gray-700/30 pl-3 ml-2">
          {JSON.stringify(entry.meta, null, 2)}
        </div>
      )}
    </div>
  )
}

// ========== 主组件 ==========
interface DebugTerminalProps {
  traceMode?: boolean
}

export function DebugTerminal({
  traceMode = false,
}: DebugTerminalProps) {
  const { logs, clear } = useTerminalLogs()
  const [autoScroll, setAutoScroll] = useState(true)
  const [collapsed, setCollapsed] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 仅显示开发者相关的日志
  const devLogs = logs.filter((entry) => DEV_TYPES.has(entry.type))

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [devLogs, autoScroll])

  // 检测用户是否手动滚离底部
  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40)
  }, [])

  return (
    <div className={cn("border-t border-terminal-border bg-black/60 flex flex-col select-none transition-all duration-200", collapsed ? 'h-8' : 'h-48')}>
      {/* 终端头部 — 标签 + 操作按钮 */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-terminal-border shrink-0">
        <div className="flex items-center gap-2">
          {/* 折叠/展开按钮 */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-[10px] text-terminal-dim hover:text-terminal-primary font-mono transition-colors mr-1"
            title={collapsed ? 'Expand terminal' : 'Collapse terminal'}
          >
            {collapsed ? '▶' : '▼'}
          </button>
          <span className="text-[10px] text-terminal-dim font-mono tracking-wider uppercase">
            OUTPUT
          </span>
          <span className="text-[10px] text-terminal-dim/40 font-mono">
            {devLogs.length} entries
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!autoScroll && (
            <span className="text-[10px] text-yellow-400 font-mono animate-pulse">
              SCROLL LOCK
            </span>
          )}
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              traceMode ? 'bg-green-400 animate-pulse' : 'bg-terminal-dim/30'
            )}
            title={traceMode ? 'Trace ON' : 'Trace OFF'}
          />
          <button
            onClick={() => clear()}
            className="text-[10px] text-terminal-dim hover:text-terminal-primary font-mono transition-colors"
            title="Clear terminal"
          >
            [CLEAR]
          </button>
        </div>
      </div>

      {/* 展开区域：日志 */}
      {!collapsed && (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden font-mono text-xs leading-snug"
          style={{ scrollBehavior: 'smooth' }}
        >
          {devLogs.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-600 text-xs font-mono">
              {'>>> '}_ NO OUTPUT
            </div>
          )}
          {devLogs.map((entry) => (
            <TerminalLogLine key={entry.id} entry={entry} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}