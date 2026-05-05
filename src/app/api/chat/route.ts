import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

// Netlify Functions 默认最大 10s，流式响应需要设为更长
export const maxDuration = 30

const LOG_PREFIX = '[catstack::server]'

interface DebugEntry {
  timestamp: number
  type: string
  content: string
  meta?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  // 服务端调试日志收集器
  const debugLogs: DebugEntry[] = []

  const serverLog = (type: string, content: string, meta?: Record<string, unknown>) => {
    debugLogs.push({ timestamp: Date.now(), type, content, meta })
  }

  try {
    const body = await request.json()
    const { conversationId, messages, apiUrl, apiKey, model } = body
    const shortId = conversationId?.slice(0, 6) ?? '????'

    console.log(`${LOG_PREFIX} REQ conv=${shortId} model=${model} url=${apiUrl}`)
    serverLog('network', `CONNECT → ${apiUrl}`, { model, messageCount: messages?.length })

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
        serverLog('error', `DB WRITE ERROR (user_msg): ${JSON.stringify(userMsgError)}`)
      } else {
        console.log(`${LOG_PREFIX} DB user_msg SAVED (${lastUserMessage.content.slice(0, 50)}...)`)
        serverLog('db', `user_msg SAVED (${lastUserMessage.content.slice(0, 50)}...)`)
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
      const existingSystemIdx = aiMessages.findIndex((m) => m.role === 'system')
      if (existingSystemIdx >= 0) {
        aiMessages[existingSystemIdx] = { role: 'system', content: conv.system_prompt }
      } else {
        aiMessages.unshift({ role: 'system', content: conv.system_prompt })
      }
    }

    // 调用 AI API (兼容 OpenAI 格式)
    const aiStartTime = performance.now()
    console.log(`${LOG_PREFIX} AI_REQ model=${model} msgCount=${aiMessages.length}`)
    serverLog('network', `AI_REQ model=${model} msgCount=${aiMessages.length}`)

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

    const networkTime = (performance.now() - aiStartTime).toFixed(0)
    serverLog('network', `RESPONSE ${aiResponse.status} (${networkTime}ms)`, {
      status: aiResponse.status,
      timing: `${networkTime}ms`,
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error(`${LOG_PREFIX} AI_ERROR status=${aiResponse.status}: ${errorText}`)
      serverLog('error', `HTTP ${aiResponse.status}: ${errorText.slice(0, 200)}`)
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

    // ====== 增量写入：开局先建一条占位 assistant 消息 ======
    let assistantMessageId: string | null = null
    {
      const { data: placeholder, error: placeholderErr } = await serviceClient
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: '',
          is_partial: true,
        })
        .select('id')
        .single()

      if (placeholderErr) {
        console.error(`${LOG_PREFIX} DB_PLACEHOLDER_ERROR:`, JSON.stringify(placeholderErr))
        serverLog('error', `PLACEHOLDER INSERT ERROR: ${JSON.stringify(placeholderErr)}`)
      } else if (placeholder) {
        assistantMessageId = placeholder.id
        serverLog('db', `PLACEHOLDER created id=${assistantMessageId?.slice(0, 8) ?? '????'}`)
      }
    }

    let fullResponse = ''
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const streamStartTime = performance.now()
    let chunkCount = 0
    let totalBytes = 0
    let lastDbUpdate = 0

    // ====== 增量更新辅助函数 ======
    const msgId = assistantMessageId
    const incrementalDbUpdate = async (content: string) => {
      if (!msgId) return
      try {
        const { error } = await serviceClient
          .from('messages')
          .update({ content, is_partial: true })
          .eq('id', msgId)

        if (error) {
          serverLog('error', `INCREMENTAL UPDATE ERROR: ${JSON.stringify(error)}`)
        }
      } catch (e) {
        serverLog('error', `INCREMENTAL UPDATE EXCEPTION: ${String(e)}`)
      }
    }

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
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify(token)}\n\n`))
                        }
                      } catch {
                        fullResponse += raw
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(raw)}\n\n`))
                      }
                    }
                  }
                }
              }

              // ====== 正常结束：finalize assistant 消息 ======
              if (fullResponse && assistantMessageId) {
                console.log(`${LOG_PREFIX} DB ai_msg FINALIZE len=${fullResponse.length}`)
                serverLog('db', `FINALIZE assistant message (${fullResponse.length} chars)`)

                const { error: finalErr } = await serviceClient
                  .from('messages')
                  .update({ content: fullResponse, is_partial: false })
                  .eq('id', assistantMessageId)

                if (finalErr) {
                  console.error(`${LOG_PREFIX} DB_FINALIZE_ERROR:`, JSON.stringify(finalErr))
                  serverLog('error', `FINALIZE ERROR: ${JSON.stringify(finalErr)}`)
                }
              }

              // 更新对话的时间戳
              await serviceClient
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', conversationId)

              const streamDuration = ((performance.now() - streamStartTime) / 1000).toFixed(1)
              serverLog('perf', `STREAM COMPLETE — ${fullResponse.length} chars in ${streamDuration}s`, {
                totalChars: fullResponse.length,
                totalBytes,
                chunkCount,
                streamDuration: `${streamDuration}s`,
              })

              console.log(`${LOG_PREFIX} STREAM COMPLETE total=${fullResponse.length} chars`)

              // ====== 发送 debug 信息给前端 ======
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ __debug: debugLogs })}\n\n`)
              )
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
              break
            }

            chunkCount++
            totalBytes += value?.length ?? 0

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
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(token)}\n\n`))
                  }
                } catch {
                  fullResponse += raw
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(raw)}\n\n`))
                }
              }
            }

            // ====== 每 8 chunks 增量写入 DB ======
            if (chunkCount - lastDbUpdate >= 8 && fullResponse) {
              lastDbUpdate = chunkCount
              serverLog('db', `INCREMENTAL UPDATE #${chunkCount} (${fullResponse.length} chars)`)

              // 不 await，fire-and-forget 避免阻塞流
              incrementalDbUpdate(fullResponse)
            }
          }
        } catch (error) {
          console.error(`${LOG_PREFIX} STREAM_ERROR:`, error)
          serverLog('error', `STREAM_ERROR: ${error instanceof Error ? error.message : String(error)}`)

          // 即使出错，也尝试保存已收到的部分
          if (fullResponse && assistantMessageId) {
            const partialContent = fullResponse + '\n\n[TRANSMISSION INTERRUPTED]'
            serverLog('db', `PARTIAL SAVE (${partialContent.length} chars)`)

            const { error: partialSaveError } = await serviceClient
              .from('messages')
              .update({ content: partialContent, is_partial: false })
              .eq('id', assistantMessageId)

            if (partialSaveError) {
              console.error(`${LOG_PREFIX} DB_PARTIAL_SAVE_ERROR:`, JSON.stringify(partialSaveError))
              serverLog('error', `PARTIAL SAVE ERROR: ${JSON.stringify(partialSaveError)}`)
            }
          }

          // 即使出错也发送 debug logs
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ __debug: debugLogs })}\n\n`)
            )
          } catch {
            // controller 可能已经关闭
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