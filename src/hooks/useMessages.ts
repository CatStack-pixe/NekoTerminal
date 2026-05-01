'use client'

import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { useSupabase } from '@/components/auth/AuthProvider'
import type { Message } from '@/types'

const PAGE_SIZE = 50

export function useMessages(conversationId: string | null) {
  const { supabase, user } = useSupabase()

  // 无限滚动分页加载消息
  const messagesQuery = useInfiniteQuery({
    queryKey: ['messages', conversationId, user?.id],
    queryFn: async ({ pageParam }) => {
      if (!supabase || !user || !conversationId) return { messages: [] as Message[], nextCursor: null }

      let query = supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE + 1) // 多取一条判断是否有更多

      if (pageParam) {
        query = query.lt('created_at', pageParam)
      }

      const { data, error } = await query.throwOnError()
      if (error) throw error

      const messages = data ?? []
      const hasMore = messages.length > PAGE_SIZE
      const sliced = hasMore ? messages.slice(0, PAGE_SIZE) : messages

      return {
        messages: sliced.reverse() as Message[], // 反转回正序
        nextCursor: hasMore ? sliced[sliced.length - 1]?.created_at ?? null : null,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
    enabled: !!supabase && !!user && !!conversationId,
  })

  // 展平所有消息
  const messages = messagesQuery.data?.pages.flatMap((page) => page.messages) ?? []

  return {
    messages,
    isLoading: messagesQuery.isLoading,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    hasNextPage: messagesQuery.hasNextPage,
    fetchNextPage: messagesQuery.fetchNextPage,
    error: messagesQuery.error,
  }
}

// 消息详情查询 (用于单个消息，如图片消息)
export function useMessage(messageId: string | null) {
  const { supabase, user } = useSupabase()

  return useQuery({
    queryKey: ['message', messageId, user?.id],
    queryFn: async () => {
      if (!supabase || !user || !messageId) return null

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single()
        .throwOnError()

      if (error) throw error
      return data as Message
    },
    enabled: !!supabase && !!user && !!messageId,
  })
}