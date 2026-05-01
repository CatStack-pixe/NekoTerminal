import { ChatRequestMessage } from '@/types'
import { createServiceClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

interface AIStreamOptions {
  model: string
  apiUrl: string
  apiKey: string
  conversationId: string
  messages: ChatRequestMessage[]
}

/**
 * 调用下游 AI API 并返回 ReadableStream
 * 同时将对话存入 Supabase
 */
export async function createAIStream(
  options: AIStreamOptions
): Promise<Response> {
  const { model, apiUrl, apiKey, conversationId, messages } = options

  // 1. 保存用户消息到数据库
  let supabaseService: SupabaseClient | null = null
  try {
    supabaseService = await createServiceClient()

    const lastMessage = messages[messages.length - 1]
    await supabaseService.from('messages').insert({
      conversation_id: conversationId,
      role: lastMessage.role,
      content: lastMessage.content,
    })

    // 更新对话标题（取前 40 字符）
    if (messages.length <= 2) {
      const title =
        lastMessage.content.substring(0, 40) +
        (lastMessage.content.length > 40 ? '…' : '')
      await supabaseService
        .from('conversations')
        .update({ title })
        .eq('id', conversationId)
    }
  } catch (err) {
    console.error('[AIStream] Failed to save user message:', err)
  }

  // 2. 构建 API 请求体
  const body = {
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: true,
  }

  // 3. 发起流式请求
  const aiResponse = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000), // 2 分钟超时
  })

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text()
    throw new Error(`AI API Error ${aiResponse.status}: ${errorText}`)
  }

  // 4. 返回一个流式响应，同时收集完整内容用于持久化
  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, controller) {
      controller.enqueue(chunk)
    },
    async flush(controller) {
      // 流结束时由 API Route 处理持久化
    },
  })

  const reader = aiResponse.body?.getReader()
  if (!reader) {
    throw new Error('AI Response body is not readable')
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  // 用于收集完整内容并持久化
  let fullContent = ''
  let buffer = ''

  const readable = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value, { stream: true })
          buffer += text

          // 解析 SSE chunks
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data:')) continue

            const data = trimmed.slice(5).trim()
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                fullContent += content

                // 作为 SSE 格式返回
                const sseChunk = `data: ${JSON.stringify({ content, fullContent })}\n\n`
                controller.enqueue(encoder.encode(sseChunk))
              }
            } catch {
              // 跳过解析失败的行
            }
          }
        }

        // 5. 持久化 AI 回复
        if (fullContent && supabaseService) {
          try {
            await supabaseService.from('messages').insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: fullContent,
            })

            await supabaseService
              .from('conversations')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', conversationId)
          } catch (err) {
            console.error('[AIStream] Failed to save assistant message:', err)
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        console.error('[AIStream] Stream error:', err)
        controller.error(err)
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}