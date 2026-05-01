'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) {
      router.replace('/?error=supabase_not_configured')
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/')
      } else {
        router.replace('/?error=auth_callback_error')
      }
    })
  }, [router])

  return (
    <div className="flex-1 flex items-center justify-center bg-terminal-bg">
      <div className="font-mono text-terminal-dim text-sm flex items-center gap-2">
        <span className="inline-block w-2 h-4 bg-terminal-primary animate-blink" />
        {'>>> '}AUTH_CALLBACK_PROCESSING...
      </div>
    </div>
  )
}