'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session, SupabaseClient } from '@supabase/supabase-js'
import type { ReactNode } from 'react'

interface AuthContextType {
  supabase: SupabaseClient | null
  user: User | null
  session: Session | null
  loading: boolean
  signInWithEmail: (email: string) => Promise<{ error?: string }>
  verifyOtp: (email: string, token: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    // 未配置 Supabase 则直接退出加载态
    if (!supabase) {
      setLoading(false)
      return
    }

    // 获取初始 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 监听 auth 变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin

  const signInWithEmail = async (email: string) => {
    if (!supabase) return { error: 'Supabase 未配置' }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    })

    if (error) {
      return { error: error.message }
    }

    return {}
  }

  // OTP 验证已废弃 —— 改用 Magic Link 回调流程
  const verifyOtp = async (_email: string, _token: string) => {
    return { error: 'OTP 已弃用，请使用 Magic Link 登录' }
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider
      value={{
        supabase,
        user,
        session,
        loading,
        signInWithEmail,
        verifyOtp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useSupabase() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within an AuthProvider')
  }
  return { supabase: context.supabase, user: context.user }
}
