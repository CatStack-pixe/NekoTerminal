'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { TerminalLogin } from '@/components/auth/TerminalLogin'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { MessageList } from '@/components/chat/MessageList'
import { ChatInput } from '@/components/chat/ChatInput'
import { ConfigDrawer } from '@/components/config/ConfigDrawer'
import { VSCodeShell } from '@/components/ui/DotMatrixBg'
import { DebugTerminal } from '@/components/ui/DebugTerminal'
import { useConversations } from '@/hooks/useConversations'
import { useMessages } from '@/hooks/useMessages'
import { useChatStream } from '@/hooks/useChatStream'
import { useTerminalLogs } from '@/lib/terminal-log-context'
import { useQueryClient } from '@tanstack/react-query'
import type { Conversation } from '@/types'

export default function HomePage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const queryClient = useQueryClient()
  const { append: terminalLog } = useTerminalLogs()

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [configOpen, setConfigOpen] = useState(false)

  const {
    conversations,
    isLoading: _convLoading,
    createConversation,
    updateConversation,
    deleteConversation,
  } = useConversations()

  const {
    messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(activeConversationId)

  const {
    streamingContent,
    isStreaming,
    sendMessageAsync,
  } = useChatStream()

  const activeConversation = conversations?.find(
    (c: Conversation) => c.id === activeConversationId
  ) ?? null

  // 新建对话
  const handleNewChat = useCallback(() => {
    createConversation.mutate(
      { title: 'NEW TRANSMISSION' },
      {
        onSuccess: (conv) => {
          setActiveConversationId(conv.id)
          terminalLog({ type: 'system', content: `NEW CONVERSATION: ${conv.title}`, conversationId: conv.id })
        },
      }
    )
  }, [createConversation, terminalLog])

  // 发送消息
  const handleSend = useCallback(
    async (content: string) => {
      let convId = activeConversationId
      let apiUrl: string
      let apiKey: string
      let model: string

      if (convId) {
        const currentConv = conversations?.find((c: Conversation) => c.id === convId)
        if (!currentConv) return
        apiUrl = currentConv.api_url
        apiKey = currentConv.api_key ?? ''
        model = currentConv.model
      } else {
        // 新建对话，使用 mutateAsync 返回的完整对象
        const title = content.substring(0, 40) + (content.length > 40 ? '…' : '')
        const conv = await createConversation.mutateAsync({ title })
        convId = conv.id
        setActiveConversationId(conv.id)
        apiUrl = conv.api_url
        apiKey = conv.api_key ?? ''
        model = conv.model
      }

      terminalLog({ type: 'user', content, conversationId: convId })
      terminalLog({ type: 'info', content: `MODEL: ${model} | URL: ${apiUrl}`, conversationId: convId })

      try {
        await sendMessageAsync({
          conversationId: convId,
          messages: [{ role: 'user' as const, content }],
          apiUrl,
          apiKey,
          model,
        })
      } catch (err) {
        terminalLog({ type: 'error', content: `SEND FAILED: ${err instanceof Error ? err.message : String(err)}`, conversationId: convId })
      }

      queryClient.invalidateQueries({ queryKey: ['messages', convId] })
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] })
    },
    [
      activeConversationId,
      conversations,
      createConversation,
      sendMessageAsync,
      queryClient,
      user?.id,
      terminalLog,
    ]
  )

  // 保存配置
  const handleConfigSave = useCallback(
    (data: { title: string; model: string; apiUrl: string; apiKey: string; systemPrompt: string }) => {
      if (!activeConversationId) return
      updateConversation.mutate({
        id: activeConversationId,
        title: data.title,
        model: data.model,
        api_url: data.apiUrl,
        api_key: data.apiKey,
        system_prompt: data.systemPrompt,
      })
      terminalLog({ type: 'info', content: `CONFIG SAVED: ${data.title} / ${data.model}`, conversationId: activeConversationId })
    },
    [activeConversationId, updateConversation, terminalLog]
  )

  // ==================== 未登录态 ====================
  if (!authLoading && !user) {
    return (
      <VSCodeShell>
        <TerminalLogin />
      </VSCodeShell>
    )
  }

  // ==================== 加载态 ====================
  if (authLoading) {
    return (
      <VSCodeShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="font-mono text-terminal-dim text-sm flex items-center gap-2">
            <span className="inline-block w-2 h-4 bg-terminal-primary animate-blink" />
            {'>>> '}SYSTEM_BOOT_SEQUENCE_INITIATED...
          </div>
        </div>
      </VSCodeShell>
    )
  }

  // ==================== 主界面 ====================
  return (
    <VSCodeShell>
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧文件资源管理器风格侧边栏 */}
        <Sidebar
          isOpen={true}
          conversations={conversations ?? []}
          activeId={activeConversationId ?? undefined}
          onSelectConversation={(conv) => setActiveConversationId(conv.id)}
          onDeleteConversation={(conv) => deleteConversation.mutate(conv.id)}
          onNewConversation={handleNewChat}
        />

        {/* 聊天主面板 */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatHeader
            title={activeConversation?.title ?? 'SELECT TRANSMISSION'}
            onToggleSidebar={() => {}}
            onOpenConfig={() => setConfigOpen(true)}
            onSignOut={signOut}
          />

          <MessageList
            messages={messages ?? []}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
            hasMore={!!hasNextPage}
            isLoadingMore={isFetchingNextPage}
            onLoadMore={() => fetchNextPage()}
          />

          <ChatInput
            onSend={handleSend}
            disabled={isStreaming}
            isStreaming={isStreaming}
          />
        </div>
      </div>

      {/* 底部终端面板 */}
      <DebugTerminal />

      {/* 配置抽屉 */}
      <ConfigDrawer
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        conversation={activeConversation}
        onSave={handleConfigSave}
      />
    </VSCodeShell>
  )
}