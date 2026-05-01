'use client'

import type { Message } from '@/types'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn(
      'flex gap-2 px-3 py-2 border-b border-terminal-border/50 last:border-b-0',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* 行号或前缀 */}
      <code className={cn(
        'text-terminal-dim/40 text-xs shrink-0 mt-0.5 select-none min-w-[2ch]',
        isUser ? 'text-left' : 'text-right'
      )}>
        {isUser ? '<' : '>'}
      </code>

      {/* 消息内容 */}
      <div className={cn('flex-1 min-w-0', isUser && 'text-right')}>
        {/* 角色标签 */}
        <div className="font-mono text-[11px] text-terminal-dim/70 mb-0.5">
          {'<'} <span className={isUser ? 'text-terminal-amber' : 'text-terminal-primary'}>{isUser ? 'USER' : 'A.I. TERMINAL'}</span> {'>'}
          {isStreaming && (
            <span className="inline-block w-2 h-3.5 bg-terminal-primary ml-1 align-text-top animate-blink" />
          )}
        </div>

        {/* 文本内容 */}
        <div className={cn(
          'font-mono text-sm leading-relaxed whitespace-pre-wrap break-words',
          isUser ? 'text-terminal-amber/80' : 'text-terminal-text'
        )}>
          {message.content || (
            <span className="text-terminal-dim italic">[EMPTY_TRANSMISSION]</span>
          )}
        </div>

        {/* 时间戳 */}
        <div className="mt-0.5 text-[10px] text-terminal-dim/40">
          <span className="font-mono">
            {'//'} {new Date(message.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </span>
        </div>
      </div>
    </div>
  )
}