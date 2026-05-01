'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTerminalLogs } from '@/lib/terminal-log-context'
import type { Message } from '@/types'

interface ChatStreamOptions {
  conversationId: string
  onToken?: (token: string) => void
  onComplete?: (fullContent: string) => void
  onError?: (error: Error) => void
}

export function useChatStream() {
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { append: terminalLog } = useTerminalLogs()
  const tokenBatchRef = useRef('')

  const clearStream = useCallback(() => {
    setStreamingContent('')
    setIsStreaming(false)
  }, [])

  // 流结束后只标记停止，不清空内容 —— 等 DB refetch 后再调用 clearStream
  const finalizeStream = useCallback(() => {
    setIsStreaming(false)
  }, [])

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
    clearStream()
  }, [clearStream])

  const streamMutation = useMutation({
    mutationFn: async ({
      conversationId,
      messages,
      apiUrl,
      apiKey,
      model,
    }: {
      conversationId: string
      messages: Pick<Message, 'role' | 'content'>[]
      apiUrl: string
      apiKey: string
      model: string
    }) => {
      const startTime = performance.now()
      setIsStreaming(true)
      setStreamingContent('')

      const controller = new AbortController()
      abortControllerRef.current = controller

      // 🔌 网络日志: 请求发起
      terminalLog({
        type: 'network',
        content: `🔌 CONNECT → ${apiUrl}`,
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
        signal: controller.signal,
      })

      const networkTime = (performance.now() - startTime).toFixed(0)
      terminalLog({
        type: 'network',
        content: `📡 RESPONSE ${response.status} (${networkTime}ms)`,
        conversationId,
        meta: { status: response.status, timing: `${networkTime}ms` },
      })

      if (!response.ok) {
        const errorBody = await response.text()
        terminalLog({
          type: 'error',
          content: `❌ HTTP ERROR ${response.status}: ${errorBody.slice(0, 200)}`,
          conversationId,
          meta: { status: response.status, body: errorBody },
        })
        throw new Error(errorBody || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let fullContent = ''
      let totalBytes = 0
      let chunkCount = 0
      let lastChunkTime = performance.now()
      const streamStartTime = performance.now()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        totalBytes += value?.length ?? 0
        chunkCount++
        const now = performance.now()
        const chunkInterval = (now - lastChunkTime).toFixed(0)
        lastChunkTime = now

        // 📥 每隔一批 chunk 汇报网络流量
        if (chunkCount % 5 === 0) {
          terminalLog({
            type: 'network',
            content: `📥 CHUNK #${chunkCount} (${totalBytes} bytes, +${chunkInterval}ms)`,
            conversationId,
            meta: { bytes: totalBytes, chunks: chunkCount, interval: `${chunkInterval}ms` },
          })
        }

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const token = JSON.parse(data) as string
              if (token && typeof token === 'string') {
                fullContent += token
                setStreamingContent((prev) => prev + token)
                tokenBatchRef.current += token
                if (tokenBatchRef.current.length >= 8) {
                  terminalLog({ type: 'token', content: tokenBatchRef.current, conversationId })
                  tokenBatchRef.current = ''
                }
              }
            } catch {
              if (data) {
                fullContent += data
                setStreamingContent((prev) => prev + data)
              }
            }
          }
        }
      }

      // 输出剩余的 token 批量
      if (tokenBatchRef.current) {
        terminalLog({ type: 'token', content: tokenBatchRef.current, conversationId })
        tokenBatchRef.current = ''
      }

      const streamDuration = ((performance.now() - streamStartTime) / 1000).toFixed(1)
      const totalTime = ((performance.now() - startTime) / 1000).toFixed(1)
      const tokCount = fullContent.length
      const tokPerSec = parseFloat(streamDuration) > 0
        ? (tokCount / parseFloat(streamDuration)).toFixed(1)
        : '0'

      // ⏱ 性能总结
      terminalLog({
        type: 'perf',
        content: `✅ STREAM COMPLETE — ${tokCount} chars in ${streamDuration}s (${tokPerSec} char/s), ${totalBytes} bytes, ${chunkCount} chunks`,
        conversationId,
        meta: {
          totalChars: tokCount,
          totalBytes,
          chunkCount,
          streamDuration: `${streamDuration}s`,
          totalTime: `${totalTime}s`,
          charsPerSec: tokPerSec,
          networkTime: `${networkTime}ms`,
        },
      })

      // 💾 DB 写入日志 (服务端已写入，此处做标记)
      terminalLog({
        type: 'db',
        content: `💾 DB WRITE: AI response saved (${tokCount} chars)`,
        conversationId,
        meta: { charCount: tokCount, bytes: totalBytes },
      })

      return fullContent
    },
    onSuccess: (_fullContent) => {
      // 不在 onSuccess 中清除 streamingContent/设置 isStreaming
      // 由调用方在 DB refetch 后调用 clearStream 完成最终清理
    },
    onError: (error) => {
      setIsStreaming(false)
      setStreamingContent('')
      terminalLog({
        type: 'error',
        content: `❌ STREAM ABORTED: ${error instanceof Error ? error.message : String(error)}`,
        meta: { error: error instanceof Error ? error.message : String(error) },
      })
    },
  })

  return {
    streamingContent,
    isStreaming,
    sendMessage: streamMutation.mutate,
    sendMessageAsync: streamMutation.mutateAsync,
    isSending: streamMutation.isPending,
    error: streamMutation.error,
    clearStream,
    finalizeStream,
    abort,
  }
}