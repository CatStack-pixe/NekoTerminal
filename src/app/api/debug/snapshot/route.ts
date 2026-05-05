import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

// API Key 脱敏：保留前3后4位，中间替换为 ***
function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '***'
  return key.slice(0, 3) + '***' + key.slice(-4)
}

// 递归遍历 JSON，脱敏所有看起来像 API Key 的字段
function sanitizeLogs(logs: unknown): unknown {
  if (typeof logs === 'string') {
    // sk- 开头的 API Key
    if (logs.startsWith('sk-') && logs.length > 20) {
      return maskApiKey(logs)
    }
    return logs
  }
  if (Array.isArray(logs)) {
    return logs.map(sanitizeLogs)
  }
  if (logs && typeof logs === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(logs as Record<string, unknown>)) {
      // 显式脱敏 apiKey / api_key 字段
      if (key === 'apiKey' || key === 'api_key') {
        sanitized[key] = maskApiKey(String(value))
      } else {
        sanitized[key] = sanitizeLogs(value)
      }
    }
    return sanitized
  }
  return logs
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId } = body

    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const serviceClient = await createServiceClient()

    // 验证用户身份
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 验证对话归属
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // 获取对话的完整消息
    const { data: messages } = await serviceClient
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    // 构建 debug 信息
    const debugLogs = [
      {
        timestamp: Date.now(),
        type: 'system',
        content: `SNAPSHOT of conversation: ${conversation.title}`,
        meta: {
          model: conversation.model,
          apiUrl: conversation.api_url,
          apiKey: maskApiKey(conversation.api_key ?? ''),
        },
      },
      {
        timestamp: Date.now(),
        type: 'messages',
        content: `${messages?.length ?? 0} messages`,
        meta: {
          messages: (messages ?? []).map((m) => ({
            role: m.role,
            content: m.content.slice(0, 1000), // 截断每条消息
            created_at: m.created_at,
          })),
        },
      },
    ]

    // 从 messages 中提取完整的 assistant 输出
    const assistantMessages = (messages ?? []).filter((m) => m.role === 'assistant')
    const fullOutput = assistantMessages.map((m) => m.content).join('\n\n---\n\n')

    // 生成随机 token
    const token = crypto.randomUUID()

    // 写入 debug_snapshots
    const { error: insertError } = await serviceClient
      .from('debug_snapshots')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        token,
        full_output: fullOutput,
        debug_logs: sanitizeLogs(debugLogs),
      })

    if (insertError) {
      console.error('Failed to create debug snapshot:', insertError)
      return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin
    const shareUrl = `${baseUrl}/debug/${token}`

    return NextResponse.json({
      url: shareUrl,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  } catch (error) {
    console.error('Debug snapshot error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}