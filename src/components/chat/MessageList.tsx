'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { MessageBubble } from './MessageBubble'
import { Spinner } from '@/components/ui/Spinner'
import type { Message } from '@/types'

interface MessageListProps {
  messages: Message[]
  streamingContent?: string
  isStreaming?: boolean
  streamPhase?: 'idle' | 'connecting' | 'first-token' | 'streaming'
  streamError?: string | null
  pendingUserContent?: string | null
  isLoadingMore?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

export function MessageList({
  messages,
  streamingContent,
  isStreaming,
  streamPhase = 'idle',
  streamError,
  pendingUserContent,
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
    if (isStreaming || streamPhase === 'connecting' || streamPhase === 'first-token') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [streamingContent, isStreaming, streamPhase])

  const handleScroll = useCallback(() => {
    if (!containerRef.current || !onLoadMore || !hasMore || isLoadingMore) return
    const { scrollTop } = containerRef.current
    if (scrollTop < 100) {
      onLoadMore()
    }
  }, [onLoadMore, hasMore, isLoadingMore])

  // "正在释放神经递质" 短暂闪现
  const [showFirstTokenMsg, setShowFirstTokenMsg] = useState(false)
  useEffect(() => {
    if (streamPhase === 'first-token' && streamingContent) {
      setShowFirstTokenMsg(true)
      const timer = setTimeout(() => setShowFirstTokenMsg(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [streamPhase, streamingContent])

  // 检查 pendingUserContent 是否已出现在 DB 消息中
  const latestUserMsg = [...messages].reverse().find(m => m.role === 'user')
  const showOptimisticUser = pendingUserContent && (!latestUserMsg || latestUserMsg.content !== pendingUserContent)

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
      {messages.length === 0 && !isStreaming && streamPhase === 'idle' && !pendingUserContent && (
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

      {/* 乐观用户消息（还未写入 DB 时立即显示） */}
      {showOptimisticUser && (
        <div className="flex flex-row-reverse gap-2 px-3 py-2 border-b border-terminal-border/50">
          <code className="text-terminal-dim/40 text-xs shrink-0 mt-0.5 select-none min-w-[2ch] text-left">
            {'<'}
          </code>
          <div className="flex-1 min-w-0 text-right">
            <div className="font-mono text-[11px] text-terminal-dim/70 mb-0.5">
              {'<'} <span className="text-terminal-amber">USER</span> {'>'}
            </div>
            <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-terminal-amber/80">
              {pendingUserContent}
            </div>
            <div className="mt-0.5 text-[10px] text-terminal-dim/40">
              <span className="font-mono">
                {'// TRANSMITTING...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 连接中：正在连接神经中枢 */}
      {streamPhase === 'connecting' && (
        <div className="flex gap-2 px-3 py-2 border-b border-terminal-border/50 animate-pulse">
          <code className="text-terminal-dim/40 text-xs shrink-0 mt-0.5 select-none min-w-[2ch] text-right">
            {'▶'}
          </code>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[11px] text-terminal-primary/80">
              ⏳ 正在连接神经中枢...
            </div>
          </div>
        </div>
      )}

      {/* 首个 token 到达：正在释放神经递质（短暂闪现后消失） */}
      {showFirstTokenMsg && (
        <div className="flex gap-2 px-3 py-2 border-b border-terminal-border/50 animate-fade-out">
          <code className="text-terminal-dim/40 text-xs shrink-0 mt-0.5 select-none min-w-[2ch] text-right">
            {'▶'}
          </code>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[11px] text-terminal-primary/80">
              🧠 正在释放神经递质...
            </div>
          </div>
        </div>
      )}

      {/* AI 流式气泡——单个气泡实时更新 */}
      {(isStreaming || streamPhase === 'streaming') && streamingContent && (
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

      {/* 错误气泡：替代 AI 回复位置 */}
      {streamError && (
        <div className="flex gap-2 px-3 py-2 border-b border-terminal-border/50 bg-terminal-bg">
          <code className="text-red-500/60 text-xs shrink-0 mt-0.5 select-none min-w-[2ch] text-right">
            {'✕'}
          </code>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[11px] text-red-500/80 mb-0.5">
              {'<'} <span className="text-red-400">ERROR</span> {'>'}
            </div>
            <div className="font-mono text-sm text-red-400/80 leading-relaxed whitespace-pre-wrap break-words">
              {streamError}
            </div>
            <div className="mt-1 text-[10px] text-terminal-dim/40">
              <span className="font-mono">
                {'// 检查连接后重新发送'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}