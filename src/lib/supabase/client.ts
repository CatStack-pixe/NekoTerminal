'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

export function createClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn('[Supabase] 缺少 NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY —— 跳过初始化')
    return null
  }

  return createBrowserClient(url, key)
}

// 单例用于客户端组件
let supabaseInstance: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance === null) {
    supabaseInstance = createClient()
  }
  return supabaseInstance
}
