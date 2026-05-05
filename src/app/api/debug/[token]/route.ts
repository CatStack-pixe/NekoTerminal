import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    const { data: snapshot, error } = await serviceClient
      .from('debug_snapshots')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !snapshot) {
      return NextResponse.json({ error: 'Snapshot not found or expired' }, { status: 404 })
    }

    // 验证是否过期
    if (snapshot.expires_at && new Date(snapshot.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Snapshot has expired' }, { status: 410 })
    }

    return NextResponse.json({
      id: snapshot.id,
      token: snapshot.token,
      fullOutput: snapshot.full_output,
      debugLogs: snapshot.debug_logs,
      createdAt: snapshot.created_at,
      expiresAt: snapshot.expires_at,
    })
  } catch (error) {
    console.error('Debug snapshot GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}