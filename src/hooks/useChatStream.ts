'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
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

  const clearStream = useCallback(() => {
    setStreamingContent('')
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

      if (!response.ok) {
        const errorBody = await response.text()
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

      return fullContent
    },
    onSuccess: (fullContent) => {
      setIsStreaming(false)
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
    abort,
  }
}