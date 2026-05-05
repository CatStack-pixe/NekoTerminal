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
import type { Conversation, Message, ProviderConfig } from '@/types'

export default function HomePage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const queryClient = useQueryClient()
  const { append: terminalLog } = useTerminalLogs()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [locked, setLocked] = useState(false)

  // 乐观消息 & 流式阶段
  const [pendingUserContent, setPendingUserContent] = useState<string | null>(null)
  const [streamPhase, setStreamPhase] = useState<'idle' | 'connecting' | 'first-token' | 'streaming'>('idle')
  const [streamError, setStreamError] = useState<string | null>(null)

  // 分享 debug 链接
  const [isSharing, setIsSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const {
    conversations,
    isLoading: convLoading,
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
    firstTokenReceived,
    isSending,
    sendMessageAsync,
    clearStream,
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

      // 清除之前的错误
      setStreamError(null)

      // 乐观显示用户消息
      setPendingUserContent(content)
      setStreamPhase('connecting')

      let providerUsed: { providerIndex: number; keyIndex: number } | null = null

      if (convId) {
        const currentConv = conversations?.find((c: Conversation) => c.id === convId)
        if (!currentConv) {
          setPendingUserContent(null)
          setStreamPhase('idle')
          return
        }

        // 优先使用 provider_configs（多厂商模式）
        const providers = currentConv.provider_configs
        if (providers && providers.length > 0) {
          const activeIdx = 0 // 使用第一个厂商作为活跃
          const provider = providers[activeIdx]
          apiUrl = provider.apiUrl || currentConv.api_url
          const ki = provider.keyIndex ?? 0
          apiKey = provider.apiKeys[ki] ?? currentConv.api_key ?? ''
          model = provider.models?.[0] ?? currentConv.model
          providerUsed = { providerIndex: activeIdx, keyIndex: ki }
          terminalLog({
            type: 'key',
            content: `PROVIDER KEY: ${provider.name} Key #${ki + 1}/${provider.apiKeys.length}`,
            conversationId: convId,
            meta: { provider: provider.name, keyIndex: ki, totalKeys: provider.apiKeys.length },
          })
        } else {
          apiUrl = currentConv.api_url
          apiKey = currentConv.api_key ?? ''
          model = currentConv.model
        }
      } else {
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
          onFirstToken: () => {
            setStreamPhase('first-token')
          },
        })

        // 成功发送后，轮转 key 索引
        if (providerUsed && convId) {
          const currentConv = conversations?.find((c: Conversation) => c.id === convId)
          if (currentConv?.provider_configs) {
            const updatedProviders = currentConv.provider_configs.map((p, i) => {
              if (i === providerUsed!.providerIndex && p.apiKeys.length > 0) {
                const nextIndex = ((p.keyIndex ?? 0) + 1) % p.apiKeys.length
                return { ...p, keyIndex: nextIndex }
              }
              return p
            })
            updateConversation.mutate({
              id: convId,
              provider_configs: updatedProviders,
            })
          }
        }

        setPendingUserContent(null)
        setStreamPhase('idle')
        setStreamError(null)
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        terminalLog({ type: 'error', content: `SEND FAILED: ${errMsg}`, conversationId: convId })
        setStreamPhase('idle')
        setStreamError(errMsg)
      }

      // 等待 DB 数据刷新后再清除流式临时气泡，避免消息闪烁/丢失
      await queryClient.invalidateQueries({ queryKey: ['messages', convId] })
      await queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] })
      clearStream()
    },
    [
      activeConversationId,
      conversations,
      createConversation,
      sendMessageAsync,
      queryClient,
      clearStream,
      user?.id,
      terminalLog,
    ]
  )

  // 重命名对话
  const handleRename = useCallback(
    (conv: Conversation, title: string) => {
      updateConversation.mutate({ id: conv.id, title })
      terminalLog({ type: 'info', content: `RENAMED: "${conv.title}" → "${title}"`, conversationId: conv.id })
    },
    [updateConversation, terminalLog]
  )

  // 分享 Debug 快照
  const handleShareDebug = useCallback(async () => {
    if (!activeConversationId) return
    setIsSharing(true)
    setShareUrl(null)
    try {
      const res = await fetch('/api/debug/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeConversationId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create snapshot')
      setShareUrl(data.url)
      await navigator.clipboard.writeText(data.url)
      terminalLog({ type: 'info', content: `DEBUG LINK COPIED: ${data.url}`, conversationId: activeConversationId })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      terminalLog({ type: 'error', content: `SHARE DEBUG FAILED: ${errMsg}`, conversationId: activeConversationId })
    } finally {
      setIsSharing(false)
    }
  }, [activeConversationId, terminalLog])

  // 是否有对话内容 (有消息或有流式内容)
  const hasContent = (messages?.length ?? 0) > 0 || !!streamingContent

  // 保存配置
  const handleConfigSave = useCallback(
    (data: { title: string; model: string; apiUrl: string; apiKey: string; systemPrompt: string; providerConfigs?: ProviderConfig[] | null }) => {
      if (!activeConversationId) return
      updateConversation.mutate({
        id: activeConversationId,
        title: data.title,
        model: data.model,
        api_url: data.apiUrl,
        api_key: data.apiKey,
        system_prompt: data.systemPrompt,
        provider_configs: data.providerConfigs ?? null,
      })
      const providerCount = data.providerConfigs?.length ?? 0
      terminalLog({ type: 'info', content: `CONFIG SAVED: ${data.model}${providerCount > 0 ? ` | ${providerCount} providers` : ''}`, conversationId: activeConversationId })
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

  // ==================== 锁定态（已登录但终端锁定） ====================
  if (locked && user) {
    return (
      <VSCodeShell>
        <TerminalLogin alreadyLoggedIn onUnlock={() => setLocked(false)} />
      </VSCodeShell>
    )
  }

  // ==================== 主界面 ====================
  return (
    <VSCodeShell
      connectionStatus={
        isStreaming ? 'streaming' :
        (isSending || createConversation.isPending) ? 'connecting' :
        streamError ? 'error' :
        'idle'
      }
    >
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧文件资源管理器风格侧边栏 */}
        <Sidebar
          isOpen={sidebarOpen}
          conversations={conversations ?? []}
          activeId={activeConversationId ?? undefined}
          isLoading={convLoading}
          onSelectConversation={(conv) => {
            setActiveConversationId(conv.id)
            // 移动端选择后自动关闭侧边栏
            if (window.innerWidth < 1024) setSidebarOpen(false)
          }}
          onDeleteConversation={(conv) => deleteConversation.mutate(conv.id)}
          onRenameConversation={handleRename}
          onNewConversation={handleNewChat}
          onClose={() => setSidebarOpen(false)}
          onOpen={() => setSidebarOpen(true)}
        />

        {/* 聊天主面板 */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatHeader
            title={activeConversation?.title ?? 'SELECT TRANSMISSION'}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onOpenConfig={() => setConfigOpen(true)}
            onSignOut={signOut}
            onLock={() => setLocked(true)}
            onShareDebug={handleShareDebug}
            hasContent={hasContent}
            isSharing={isSharing}
          />

          <MessageList
            messages={messages ?? []}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
            streamPhase={streamPhase}
            streamError={streamError}
            pendingUserContent={pendingUserContent}
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