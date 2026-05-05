'use client'

import { Suspense, useEffect, useState } from 'react'
import { VSCodeShell } from '@/components/ui/DotMatrixBg'

interface DebugSnapshot {
  id: string
  token: string
  fullOutput: string
  debugLogs: DebugEntry[]
  createdAt: string
  expiresAt: string
}

interface DebugEntry {
  timestamp: number
  type: string
  content: string
  meta?: Record<string, unknown>
}

const TYPE_LABELS: Record<string, string> = {
  system: 'INFO',
  user: 'INFO',
  ai: 'INFO',
  error: 'ERROR',
  info: 'INFO',
  token: 'DEBUG',
  network: 'DEBUG',
  db: 'DEBUG',
  perf: 'DEBUG',
  warn: 'WARNING',
  debug: 'DEBUG',
  key: 'INFO',
  messages: 'INFO',
}

const LABEL_COLORS: Record<string, string> = {
  INFO: 'text-gray-300',
  WARNING: 'text-yellow-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-gray-500',
}

function DebugLogLine({ entry }: { entry: DebugEntry }) {
  const [expanded, setExpanded] = useState(false)
  const label = TYPE_LABELS[entry.type] ?? 'INFO'
  const time = new Date(entry.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false,
  })

  return (
    <div
      className={`group flex items-start gap-1.5 py-0.5 font-mono text-xs leading-relaxed cursor-pointer hover:bg-white/5 px-2 ${LABEL_COLORS[label] ?? 'text-gray-300'}`}
      onClick={() => entry.meta && setExpanded(!expanded)}
    >
      <span className="text-gray-600 shrink-0 select-none text-[10px] pt-px">{time}</span>
      <span className={`shrink-0 select-none font-bold text-[10px] ${LABEL_COLORS[label]}`}>[{label}]</span>
      <span className="flex-1 break-words whitespace-pre-wrap">{entry.content}</span>
      {entry.meta && (
        <span className="text-gray-600 shrink-0 select-none text-[10px]">{expanded ? '▼' : '▶'}</span>
      )}
      {expanded && entry.meta && (
        <div className="w-full pl-14 text-[10px] text-gray-500 whitespace-pre-wrap font-mono mt-0.5 border-l border-gray-700/30 pl-3 ml-2">
          {JSON.stringify(entry.meta, null, 2)}
        </div>
      )}
    </div>
  )
}

function LoadingShell() {
  return (
    <VSCodeShell>
      <div className="flex-1 flex items-center justify-center">
        <div className="font-mono text-terminal-dim text-sm flex items-center gap-2">
          <span className="inline-block w-2 h-4 bg-terminal-primary animate-blink" />
          {'>>> '}LOADING DEBUG SNAPSHOT...
        </div>
      </div>
    </VSCodeShell>
  )
}

function DebugPageContent({ params }: { params: { token: string } }) {
  const { token } = params
  const [snapshot, setSnapshot] = useState<DebugSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    fetch(`/api/debug/${token}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 410) throw new Error('This debug snapshot has expired.')
          if (res.status === 404) throw new Error('Debug snapshot not found.')
          throw new Error(`Failed to load snapshot (${res.status})`)
        }
        return res.json()
      })
      .then((data) => {
        if (!mounted) return
        setSnapshot(data)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.message)
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [token])

  useEffect(() => {
    if (!snapshot?.expiresAt) return

    const updateTimer = () => {
      const now = new Date()
      const expiry = new Date(snapshot.expiresAt)
      const diff = expiry.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('EXPIRED')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [snapshot?.expiresAt])

  if (loading) {
    return <LoadingShell />
  }

  if (error) {
    return (
      <VSCodeShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="font-mono text-terminal-red text-sm">
            {'>>> ERROR: '}{error}
          </div>
        </div>
      </VSCodeShell>
    )
  }

  if (!snapshot) return null

  return (
    <VSCodeShell>
      <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-terminal-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-terminal-primary tracking-wider uppercase">DEBUG SNAPSHOT</span>
            <span className="font-mono text-[10px] text-terminal-dim">TOKEN: {token.slice(0, 8)}...</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] text-terminal-dim">
              Created: {new Date(snapshot.createdAt).toLocaleString('zh-CN')}
            </span>
            {timeLeft && (
              <span className={`font-mono text-[10px] font-bold ${timeLeft === 'EXPIRED' ? 'text-terminal-red' : 'text-terminal-amber'}`}>
                {timeLeft === 'EXPIRED' ? '⏰ EXPIRED' : `⏳ ${timeLeft}`}
              </span>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto font-mono text-sm leading-relaxed p-4">
          <div className="mb-6">
            <div className="text-[10px] text-terminal-dim font-bold uppercase tracking-wider mb-2 border-b border-terminal-border pb-1">
              {'>>>'} FULL OUTPUT
            </div>
            <pre className="text-terminal-text whitespace-pre-wrap break-words text-xs">{snapshot.fullOutput || '(empty)'}</pre>
          </div>

          <div>
            <div className="text-[10px] text-terminal-dim font-bold uppercase tracking-wider mb-2 border-b border-terminal-border pb-1">
              {'>>>'} DEBUG LOGS ({snapshot.debugLogs?.length ?? 0} entries)
            </div>
            {!snapshot.debugLogs?.length && (
              <div className="text-gray-600 text-xs font-mono py-4 px-2">{'>>> '}_ NO LOGS</div>
            )}
            <div className="border border-terminal-border/30 rounded overflow-hidden">
              {snapshot.debugLogs?.map((entry, idx) => (
                <DebugLogLine key={idx} entry={entry} />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-t border-terminal-border shrink-0">
          <span className="font-mono text-[10px] text-terminal-dim">
            NekoTerminal Debug View — Read Only
          </span>
          <span className="font-mono text-[10px] text-terminal-dim/50">
            #{snapshot.id.slice(0, 6)}
          </span>
        </div>
      </div>
    </VSCodeShell>
  )
}

export default function DebugPage({ params }: { params: { token: string } }) {
  return (
    <Suspense fallback={<LoadingShell />}>
      <DebugPageContent params={params} />
    </Suspense>
  )
}