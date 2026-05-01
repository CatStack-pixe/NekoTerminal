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
      setIsStreaming(true)
      setStreamingContent('')

      const controller = new AbortController()
      abortControllerRef.current = controller

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

      terminalLog({ type: 'system', content: `STREAM START (model: ${model})`, conversationId })

      if (!response.ok) {
        const errorBody = await response.text()
        terminalLog({ type: 'error', content: `HTTP ERROR ${response.status}: ${errorBody}`, conversationId })
        throw new Error(errorBody || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        // 处理 SSE 格式: data: <JSON-stringified token>\n\n
        // 服务端已将 AI 的原始 SSE 解析为纯净 token 并 JSON.stringify 后发送
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              // 服务端发送的是 JSON.stringify(token)，解析获取原始字符串
              const token = JSON.parse(data) as string
              if (token && typeof token === 'string') {
                fullContent += token
                setStreamingContent((prev) => prev + token)
                // 批量记录 token，每积累 8+ 个字符输出一次
                tokenBatchRef.current += token
                if (tokenBatchRef.current.length >= 8) {
                  terminalLog({ type: 'token', content: tokenBatchRef.current, conversationId })
                  tokenBatchRef.current = ''
                }
              }
            } catch {
              // JSON 解析失败，直接作为纯文本追加（向后兼容）
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

      return fullContent
    },
    onSuccess: (_fullContent) => {
      // 不在 onSuccess 中清除 streamingContent/设置 isStreaming
      // 由调用方在 DB refetch 后调用 clearStream 完成最终清理
    },
    onError: (error) => {
      setIsStreaming(false)
      setStreamingContent('')
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