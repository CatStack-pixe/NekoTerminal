'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTerminalLogs, type TerminalLogType } from '@/lib/terminal-log-context'
import type { Message } from '@/types'

interface DebugEntry {
  timestamp: number
  type: string
  content: string
  meta?: Record<string, unknown>
}

// 打字机动画速度 (ms/字符)，带随机抖动模拟真实流式感
const TYPEWRITER_BASE_SPEED = 25
const TYPEWRITER_JITTER = 15

export function useChatStream() {
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [firstTokenReceived, setFirstTokenReceived] = useState(false)
  const firstTokenRef = useRef(false)
  const onFirstTokenRef = useRef<(() => void) | null>(null)
  const { append: terminalLog } = useTerminalLogs()
  const typewriterAbortRef = useRef<AbortController | null>(null)

  const clearStream = useCallback(() => {
    typewriterAbortRef.current?.abort()
    typewriterAbortRef.current = null
    setStreamingContent('')
    setIsStreaming(false)
    setFirstTokenReceived(false)
    firstTokenRef.current = false
    onFirstTokenRef.current = null
  }, [])

  const finalizeStream = useCallback(() => {
    setIsStreaming(false)
  }, [])

  const abort = useCallback(() => {
    clearStream()
  }, [clearStream])

  const streamMutation = useMutation({
    mutationFn: async ({
      conversationId,
      messages,
      apiUrl,
      apiKey,
      model,
      onFirstToken,
    }: {
      conversationId: string
      messages: Pick<Message, 'role' | 'content'>[]
      apiUrl: string
      apiKey: string
      model: string
      onFirstToken?: () => void
    }) => {
      onFirstTokenRef.current = onFirstToken ?? null

      const startTime = performance.now()
      setIsStreaming(true)
      setStreamingContent('')
      setFirstTokenReceived(false)
      firstTokenRef.current = false

      // 取消上一次的打字机动画
      typewriterAbortRef.current?.abort()
      const abortController = new AbortController()
      typewriterAbortRef.current = abortController

      // 🔌 网络日志
      terminalLog({
        type: 'network',
        content: `CONNECT → ${apiUrl}`,
        conversationId,
        meta: { model, messageCount: messages.length, timestamp: Date.now() },
      })

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          apiUrl,
          apiKey,
          model,
        }),
        signal: abortController.signal,
      })

      const networkTime = (performance.now() - startTime).toFixed(0)
      terminalLog({
        type: 'network',
        content: `RESPONSE ${response.status} (${networkTime}ms)`,
        conversationId,
        meta: { status: response.status, timing: `${networkTime}ms` },
      })

      if (!response.ok) {
        const errorBody = await response.text()
        terminalLog({
          type: 'error',
          content: `HTTP ERROR ${response.status}: ${errorBody.slice(0, 200)}`,
          conversationId,
          meta: { status: response.status, body: errorBody },
        })
        throw new Error(errorBody || `HTTP ${response.status}`)
      }

      // 解析非流式 JSON 响应
      const data = await response.json()
      const fullContent = data.content as string
      const serverDebug = data.__debug as DebugEntry[] | undefined

      // 输出服务端 debug 日志
      if (serverDebug) {
        for (const entry of serverDebug) {
          terminalLog({
            type: entry.type as TerminalLogType,
            content: entry.content,
            conversationId,
            meta: entry.meta,
          })
        }
      }

      const totalTime = ((performance.now() - startTime) / 1000).toFixed(1)
      terminalLog({
        type: 'perf',
        content: `AI RESPONSE — ${fullContent.length} chars in ${totalTime}s (network: ${networkTime}ms)`,
        conversationId,
        meta: {
          totalChars: fullContent.length,
          totalTime: `${totalTime}s`,
          networkTime: `${networkTime}ms`,
        },
      })

      // ====== 打字机动画：逐字输出模拟流式效果 ======
      if (fullContent && !abortController.signal.aborted) {
        let index = 0
        setStreamingContent('')
        firstTokenRef.current = false

        await new Promise<void>((resolve) => {
          const tick = () => {
            if (abortController.signal.aborted) {
              resolve()
              return
            }
            index++
            if (index > fullContent.length) {
              resolve()
              return
            }
            const partial = fullContent.slice(0, index)
            setStreamingContent(partial)
            if (!firstTokenRef.current && partial.length > 0) {
              firstTokenRef.current = true
              setFirstTokenReceived(true)
              onFirstTokenRef.current?.()
            }
            // 随机延迟模拟真实流式感
            const delay = TYPEWRITER_BASE_SPEED + Math.random() * TYPEWRITER_JITTER
            setTimeout(tick, delay)
          }
          // 首字符立即输出
          tick()
        })
      }

      // 打字机完成，不清除 isStreaming——由调用方 clearStream 统一清理
      return fullContent
    },
    onError: (error) => {
      setIsStreaming(false)
      setStreamingContent('')
      firstTokenRef.current = false
      onFirstTokenRef.current = null
      terminalLog({
        type: 'error',
        content: `STREAM ABORTED: ${error instanceof Error ? error.message : String(error)}`,
        meta: { error: error instanceof Error ? error.message : String(error) },
      })
    },
  })

  return {
    streamingContent,
    isStreaming,
    firstTokenReceived,
    sendMessage: streamMutation.mutate,
    sendMessageAsync: streamMutation.mutateAsync,
    isSending: streamMutation.isPending,
    error: streamMutation.error,
    clearStream,
    finalizeStream,
    abort,
  }
}