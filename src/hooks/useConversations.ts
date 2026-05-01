'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/components/auth/AuthProvider'
import type { Conversation } from '@/types'

export function useConversations() {
  const { supabase, user } = useSupabase()
  const queryClient = useQueryClient()

  // 获取对话列表
  const conversationsQuery = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!supabase || !user) return [] as Conversation[]

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .throwOnError()

      if (error) throw error
      return data as Conversation[]
    },
    enabled: !!supabase && !!user,
  })

  // 创建新对话
  const createConversation = useMutation({
    mutationFn: async (payload: Partial<Conversation>) => {
      if (!supabase || !user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: payload.title ?? 'New Channel',
          model: payload.model ?? 'gpt-4o-mini',
          api_url: payload.api_url ?? 'https://api.openai.com/v1',
          api_key: payload.api_key ?? '',
          system_prompt: payload.system_prompt ?? '',
        })
        .select()
        .single()
        .throwOnError()

      if (error) throw error
      return data as Conversation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] })
    },
  })

  // 更新对话
  const updateConversation = useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: Partial<Conversation> & { id: string }) => {
      if (!supabase || !user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('conversations')
        .update({
          title: payload.title,
          model: payload.model,
          api_url: payload.api_url,
          api_key: payload.api_key,
          system_prompt: payload.system_prompt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()
        .throwOnError()

      if (error) throw error
      return data as Conversation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] })
    },
  })

  // 删除对话
  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase || !user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .throwOnError()

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] })
    },
  })

  return {
    conversations: conversationsQuery.data ?? [],
    isLoading: conversationsQuery.isLoading,
    error: conversationsQuery.error,
    createConversation,
    updateConversation,
    deleteConversation,
  }
}