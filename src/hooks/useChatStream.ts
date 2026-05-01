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
      messages: Pick<Message, 'role' | 'content' | 'image_url'>[]
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
            image_url: m.image_url,
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
        // 处理 SSE 格式: data: <content>\n\n
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const token = parsed.choices?.[0]?.delta?.content || parsed.content || ''
              if (token) {
                fullContent += token
                setStreamingContent((prev) => prev + token)
              }
            } catch {
              // 非 JSON 数据，直接作为文本追加
              fullContent += data
              setStreamingContent((prev) => prev + data)
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