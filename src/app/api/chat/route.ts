import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

// Netlify Functions 默认最大 10s，流式响应需要设为更长
export const maxDuration = 30

const LOG_PREFIX = '[catstack::server]'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, messages, apiUrl, apiKey, model } = body
    const shortId = conversationId?.slice(0, 6) ?? '????'

    console.log(`${LOG_PREFIX} REQ conv=${shortId} model=${model} url=${apiUrl}`)

    if (!conversationId || !messages?.length || !apiUrl || !apiKey || !model) {
      console.warn(`${LOG_PREFIX} BAD_REQUEST missing fields`)
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = await createServerClient()
    // service_role 客户端用于写入（绕过 RLS，确保消息能持久化）
    const serviceClient = await createServiceClient()

    // 验证用户身份
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.warn(`${LOG_PREFIX} UNAUTHORIZED`)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    console.log(`${LOG_PREFIX} AUTH user=${user.id.slice(0, 8)}`)

    // 验证对话归属
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (!conversation) {
      console.warn(`${LOG_PREFIX} NOT_FOUND conv=${shortId}`)
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 保存用户消息到数据库 (使用 service_role 客户端确保写入)
    const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === 'user')
    if (lastUserMessage) {
      const { error: userMsgError } = await serviceClient.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: lastUserMessage.content,
      })
      if (userMsgError) {
        console.error(`${LOG_PREFIX} DB_WRITE_ERROR user_msg:`, JSON.stringify(userMsgError))
      } else {
        console.log(`${LOG_PREFIX} DB user_msg SAVED (${lastUserMessage.content.slice(0, 50)}...)`)
      }
    }

    // 构建发送给 AI 的消息列表
    // 从数据库中获取历史消息，加上当前消息
    const { data: historyMessages } = await serviceClient
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(50)

    const aiMessages = (historyMessages ?? []).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // 始终从 conversations 表注入 system_prompt（如果存在）
    const { data: conv } = await serviceClient
      .from('conversations')
      .select('system_prompt')
      .eq('id', conversationId)
      .single()

    if (conv?.system_prompt) {
      // 查找是否已有 system 消息，有则替换，无则插入到最前
      const existingSystemIdx = aiMessages.findIndex((m) => m.role === 'system')
      if (existingSystemIdx >= 0) {
        aiMessages[existingSystemIdx] = { role: 'system', content: conv.system_prompt }
      } else {
        aiMessages.unshift({ role: 'system', content: conv.system_prompt })
      }
    }

    // 调用 AI API (兼容 OpenAI 格式)
    console.log(`${LOG_PREFIX} AI_REQ model=${model} msgCount=${aiMessages.length}`)

    const aiResponse = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: aiMessages,
        stream: true,
      }),
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error(`${LOG_PREFIX} AI_ERROR status=${aiResponse.status}: ${errorText}`)
      return new Response(JSON.stringify({ error: `AI API error: ${errorText}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    console.log(`${LOG_PREFIX} AI_STREAM START`)

    // 创建 TransformStream 用于流式转发 + 捕获完整内容
    const reader = aiResponse.body?.getReader()
    if (!reader) {
      return new Response(JSON.stringify({ error: 'No response body from AI' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let fullResponse = ''
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        let sseBuffer = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              // 处理缓冲区中剩余的数据
              if (sseBuffer.trim()) {
                const finalLines = sseBuffer.split('\n')
                for (const line of finalLines) {
                  if (line.startsWith('data: ')) {
                    const raw = line.slice(6).trim()
                    if (raw && raw !== '[DONE]') {
                      try {
                        const parsed = JSON.parse(raw)
                        const token = parsed.choices?.[0]?.delta?.content ?? ''
                        if (token) {
                          fullResponse += token
                          // 发送纯净的 token 给客户端 (JSON 包裹避免换行问题)
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify(token)}\n\n`))
                        }
                      } catch {
                        // 非 JSON 行，直接转发
                        fullResponse += raw
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(raw)}\n\n`))
                      }
                    }
                  }
                }
              }

              // 保存完整的 AI 回复到数据库 (使用 service_role 客户端确保写入)
              if (fullResponse) {
                console.log(`${LOG_PREFIX} DB ai_msg SAVING len=${fullResponse.length}`)
                await serviceClient
                  .from('messages')
                  .insert({
                    conversation_id: conversationId,
                    role: 'assistant',
                    content: fullResponse,
                  })
                  .throwOnError()

                // 更新对话的时间戳
                await serviceClient
                  .from('conversations')
                  .update({ updated_at: new Date().toISOString() })
                  .eq('id', conversationId)
                  .throwOnError()

                console.log(`${LOG_PREFIX} STREAM COMPLETE total=${fullResponse.length} chars`)
              }

              // 发送结束信号
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
              break
            }

            // 将新数据追加到缓冲区
            sseBuffer += decoder.decode(value, { stream: true })

            // 按行分割，保留最后一个不完整的行
            const lines = sseBuffer.split('\n')
            sseBuffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.trim()) continue
              if (line.startsWith('data: ')) {
                const raw = line.slice(6).trim()
                if (raw === '[DONE]') continue
                try {
                  const parsed = JSON.parse(raw)
                  const token = parsed.choices?.[0]?.delta?.content ?? ''
                  if (token) {
                    fullResponse += token
                    // 发送纯净的 token 给客户端 (JSON 包裹避免换行嵌入导致解析异常)
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(token)}\n\n`))
                  }
                } catch {
                  // 非 JSON 数据，直接作为文本转发
                  fullResponse += raw
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(raw)}\n\n`))
                }
              }
            }
          }
        } catch (error) {
          console.error(`${LOG_PREFIX} STREAM_ERROR:`, error)
          // 即使出错，也尝试保存已收到的部分
          if (fullResponse) {
            const { error: partialSaveError } = await serviceClient.from('messages').insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: fullResponse + '\n\n[TRANSMISSION INTERRUPTED]',
            })
            if (partialSaveError) {
              console.error(`${LOG_PREFIX} DB_PARTIAL_SAVE_ERROR:`, JSON.stringify(partialSaveError))
            }
          }
          try {
            controller.error(error)
          } catch {
            // controller 可能已经关闭
          }
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error(`${LOG_PREFIX} FATAL:`, error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}