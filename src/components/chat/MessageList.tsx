'use client'

import { useRef, useEffect, useCallback } from 'react'
import { MessageBubble } from './MessageBubble'
import { Spinner } from '@/components/ui/Spinner'
import type { Message } from '@/types'

interface MessageListProps {
  messages: Message[]
  streamingContent?: string
  isStreaming?: boolean
  isLoadingMore?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

export function MessageList({
  messages,
  streamingContent,
  isStreaming,
  isLoadingMore,
  hasMore,
  onLoadMore,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevMsgCountRef = useRef(messages.length)

  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMsgCountRef.current = messages.length
  }, [messages.length])

  useEffect(() => {
    if (isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [streamingContent, isStreaming])

  const handleScroll = useCallback(() => {
    if (!containerRef.current || !onLoadMore || !hasMore || isLoadingMore) return
    const { scrollTop } = containerRef.current
    if (scrollTop < 100) {
      onLoadMore()
    }
  }, [onLoadMore, hasMore, isLoadingMore])

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto overflow-x-hidden bg-terminal-bg"
    >
      {/* 顶部加载更多 */}
      {hasMore && (
        <div className="flex justify-center py-2 border-b border-terminal-border/30">
          {isLoadingMore ? (
            <Spinner size="sm" />
          ) : (
            <span className="font-mono text-[10px] text-terminal-dim/50">
              {'//'} LOAD MORE HISTORY...
            </span>
          )}
        </div>
      )}

      {/* 空状态 */}
      {messages.length === 0 && !isStreaming && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="font-mono text-xs text-terminal-dim/60">
              {'//'} CHANNEL OPEN
            </p>
            <p className="font-mono text-xs text-terminal-dim/40 mt-1">
              {';'} AWAITING TRANSMISSION...
            </p>
          </div>
        </div>
      )}

      {/* 消息列表 */}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* 流式输出中的临时消息 */}
      {isStreaming && streamingContent && (
        <div className="flex gap-2 px-3 py-2 border-b border-terminal-border/50">
          <code className="text-terminal-dim/40 text-xs shrink-0 mt-0.5 select-none min-w-[2ch] text-right">
            {'>'}
          </code>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[11px] text-terminal-dim/70 mb-0.5">
              {'<'} <span className="text-terminal-primary">A.I. TERMINAL</span> {'>'}
              <span className="inline-block w-2 h-3.5 bg-terminal-primary ml-1 align-text-top animate-blink" />
            </div>
            <div className="font-mono text-sm text-terminal-text leading-relaxed whitespace-pre-wrap break-words">
              {streamingContent}
              <span className="inline-block w-2 h-3.5 bg-terminal-primary ml-0.5 align-text-bottom animate-blink" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}