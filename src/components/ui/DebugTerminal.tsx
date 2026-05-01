'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useTerminalLogs, type TerminalLogEntry } from '@/lib/terminal-log-context'
import {
  CATSTACK_BANNER,
  asciiTable,
  doubleDivider,
  singleDivider,
  progressBar,
  statusLabel,
  SPINNER_FRAMES,
} from '@/lib/ascii-art'

// ========== 类型颜色映射 ==========
const TYPE_COLORS: Record<string, string> = {
  system: 'text-terminal-dim',
  user: 'text-terminal-amber/80',
  ai: 'text-terminal-text',
  error: 'text-red-400',
  info: 'text-terminal-dim',
  token: 'text-terminal-text opacity-50',
  network: 'text-cyan-400',
  db: 'text-green-400',
  perf: 'text-yellow-400',
  warn: 'text-yellow-300',
  debug: 'text-purple-400',
}

const TYPE_PREFIX: Record<string, string> = {
  system: '⚙',
  user: '▶',
  ai: '◀',
  error: '✖',
  info: 'ℹ',
  token: '·',
  network: '⬡',
  db: '⬢',
  perf: '⏱',
  warn: '⚠',
  debug: '🐛',
}

// ========== 日志行组件 ==========
function TerminalLogLine({ entry }: { entry: TerminalLogEntry }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'group flex items-start gap-1.5 py-0.5 font-mono text-xs leading-relaxed cursor-pointer hover:bg-white/5 px-2',
        TYPE_COLORS[entry.type]
      )}
      onClick={() => entry.meta && setExpanded(!expanded)}
    >
      {/* 时间戳 */}
      <span className="text-terminal-dim/40 shrink-0 select-none text-[10px] pt-px">
        {entry.timestamp}
      </span>
      {/* 类型标签 */}
      <span
        className={cn(
          'shrink-0 select-none w-4 text-center',
          TYPE_COLORS[entry.type]
        )}
      >
        {TYPE_PREFIX[entry.type] ?? '·'}
      </span>
      {/* 内容 */}
      <span className="flex-1 break-words whitespace-pre-wrap">
        {entry.content}
      </span>
      {/* 会话 ID 短码 */}
      {entry.conversationId && (
        <span className="text-terminal-dim/20 shrink-0 select-none text-[10px]">
          #{entry.conversationId.slice(0, 6)}
        </span>
      )}
      {/* meta 展开指示 */}
      {entry.meta && (
        <span className="text-terminal-dim/30 shrink-0 select-none text-[10px]">
          {expanded ? '▼' : '▶'}
        </span>
      )}
      {/* 展开的 meta 数据 */}
      {expanded && entry.meta && (
        <div className="w-full pl-14 text-[10px] text-terminal-dim/60 whitespace-pre-wrap font-mono mt-0.5 border-l border-terminal-border/30 pl-3 ml-2">
          {JSON.stringify(entry.meta, null, 2)}
        </div>
      )}
    </div>
  )
}

// ========== 帮助文本 ==========
const HELP_TEXT = [
  doubleDivider(40),
  '  CATSTACK TERMINAL COMMAND LINE v2.0',
  singleDivider(40),
  '  /help         — Show this help',
  '  /clear        — Clear terminal screen',
  '  /banner       — Display CatStack ASCII art',
  '  /status       — System diagnostics panel',
  '  /inspect      — Show current session details',
  '  /trace        — Toggle detailed trace mode',
  '  /echo <text>  — Echo text back',
  '  /models       — List available AI models',
  singleDivider(40),
  '  All slash commands also auto-log to terminal.',
  doubleDivider(40),
].join('\n')

// ========== 主组件 ==========
interface DebugTerminalProps {
  /** 当前对话信息，供 /status /inspect 使用 */
  activeConversation?: {
    id: string
    title: string
    model: string
    api_url: string
    created_at?: string
  } | null
  messageCount?: number
  traceMode?: boolean
  onToggleTrace?: () => void
}

export function DebugTerminal({
  activeConversation,
  messageCount = 0,
  traceMode = false,
  onToggleTrace,
}: DebugTerminalProps) {
  const { logs, append, clear } = useTerminalLogs()
  const [input, setInput] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [bannerShown, setBannerShown] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  // 首次加载显示 Banner
  useEffect(() => {
    if (!bannerShown) {
      append({ type: 'system', content: CATSTACK_BANNER })
      append({ type: 'system', content: HELP_TEXT })
      setBannerShown(true)
    }
  }, [append, bannerShown])

  // 点击日志区域聚焦输入框
  const focusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  // 处理命令
  const handleCommand = useCallback(
    (cmd: string) => {
      const trimmed = cmd.trim()
      if (!trimmed) return

      // 回显命令
      append({ type: 'system', content: `$ ${trimmed}` })

      const lower = trimmed.toLowerCase()

      if (lower === '/help') {
        append({ type: 'system', content: HELP_TEXT })
      } else if (lower === '/clear') {
        clear()
      } else if (lower === '/banner') {
        append({ type: 'system', content: CATSTACK_BANNER })
      } else if (lower === '/status') {
        const statusLines = [
          doubleDivider(40),
          '  SYSTEM STATUS',
          singleDivider(40),
          statusLabel('App', 'CatStack Terminal v2.0'),
          statusLabel('Page URL', typeof window !== 'undefined' ? window.location.href : 'N/A'),
          statusLabel('Timestamp', new Date().toISOString()),
          statusLabel('Log Entries', String(logs.length)),
          statusLabel('Trace Mode', traceMode ? 'ENABLED' : 'DISABLED'),
          singleDivider(40),
        ]
        if (activeConversation) {
          statusLines.push(
            '  ACTIVE SESSION',
            singleDivider(40),
            statusLabel('Session ID', activeConversation.id),
            statusLabel('Title', activeConversation.title),
            statusLabel('Model', activeConversation.model),
            statusLabel('API URL', activeConversation.api_url),
            statusLabel('Messages', String(messageCount)),
            singleDivider(40)
          )
        }
        statusLines.push(doubleDivider(40))
        append({ type: 'system', content: statusLines.join('\n') })
      } else if (lower === '/inspect') {
        if (!activeConversation) {
          append({ type: 'warn', content: 'No active session to inspect.' })
        } else {
          const table = asciiTable(
            ['Property', 'Value'],
            [
              ['ID', activeConversation.id],
              ['Title', activeConversation.title],
              ['Model', activeConversation.model],
              ['API URL', activeConversation.api_url],
              [
                'Created',
                activeConversation.created_at ?? 'N/A',
              ],
              ['Messages', String(messageCount)],
              ['Log Entries', String(logs.length)],
            ]
          )
          append({ type: 'system', content: table })
        }
      } else if (lower === '/trace') {
        if (onToggleTrace) {
          onToggleTrace()
          append({
            type: 'warn',
            content: `TRACE MODE: ${!traceMode ? 'ENABLED' : 'DISABLED'}`,
          })
        } else {
          append({ type: 'warn', content: 'Trace toggle not connected.' })
        }
      } else if (lower.startsWith('/echo ')) {
        const text = trimmed.slice(6)
        append({ type: 'system', content: text })
      } else if (lower === '/models') {
        const table = asciiTable(
          ['Model', 'Provider', 'Context'],
          [
            ['deepseek-chat', 'DeepSeek', '64K'],
            ['deepseek-reasoner', 'DeepSeek', '64K'],
            ['gpt-4o', 'OpenAI', '128K'],
            ['claude-3.5-sonnet', 'Anthropic', '200K'],
            ['gemini-2.0-flash', 'Google', '1M'],
            ['qwen-max', 'Alibaba', '32K'],
          ]
        )
        append({ type: 'system', content: table })
      } else {
        append({ type: 'error', content: `UNKNOWN COMMAND: ${trimmed}. Try /help` })
      }
    },
    [append, clear, logs.length, activeConversation, messageCount, traceMode, onToggleTrace]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCommand(input)
      setInput('')
    }
  }

  // 检测用户是否手动滚离底部
  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40)
  }, [])

  return (
    <div className="border-t border-terminal-border bg-black/60 flex flex-col h-48 select-none">
      {/* 终端头部 — 标签 + 滚动锁定指示 */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-terminal-dim font-mono tracking-wider uppercase">
            TERMINAL
          </span>
          <span className="text-[10px] text-terminal-dim/40 font-mono">
            {logs.length} entries
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

      {/* 日志区域 */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onClick={focusInput}
        className="flex-1 overflow-y-auto overflow-x-hidden font-mono text-xs leading-snug"
        style={{ scrollBehavior: 'smooth' }}
      >
        {logs.length === 0 && (
          <div className="flex items-center justify-center h-full text-terminal-dim/30 text-xs font-mono">
            {'>>> '}_ TERMINAL READY — TYPE /help FOR COMMANDS
          </div>
        )}
        {logs.map((entry) => (
          <TerminalLogLine key={entry.id} entry={entry} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 命令行输入 */}
      <div className="flex items-center gap-1.5 px-2 py-1 border-t border-terminal-border/50 bg-[#1e1e1e]">
        <span className="text-terminal-primary text-xs font-mono shrink-0">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="type /help for commands..."
          className="flex-1 bg-transparent border-none outline-none font-mono text-xs text-terminal-text placeholder:text-terminal-dim/30 py-0.5"
          spellCheck={false}
          autoComplete="off"
        />
        <span className="text-terminal-primary/40 text-xs font-mono animate-pulse shrink-0">
          ▊
        </span>
      </div>
    </div>
  )
}