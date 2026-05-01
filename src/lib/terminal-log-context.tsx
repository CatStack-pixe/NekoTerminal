'use client'

import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react'

export type TerminalLogType = 'system' | 'user' | 'ai' | 'error' | 'info' | 'token' | 'network' | 'db' | 'perf' | 'warn' | 'debug'

export interface TerminalLogEntry {
  id: number
  timestamp: string
  type: TerminalLogType
  content: string
  conversationId?: string
  /** 结构化附加数据，用于详情展示 */
  meta?: Record<string, unknown>
}

type TerminalLogAction =
  | { type: 'APPEND'; payload: Omit<TerminalLogEntry, 'id' | 'timestamp'> }
  | { type: 'CLEAR' }

let nextId = 0

function terminalLogReducer(state: TerminalLogEntry[], action: TerminalLogAction): TerminalLogEntry[] {
  switch (action.type) {
    case 'APPEND': {
      const entry: TerminalLogEntry = {
        ...action.payload,
        id: nextId++,
        timestamp: new Date().toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          fractionalSecondDigits: 3,
          hour12: false,
        }),
      }
  // 只保留最近 800 条（更多以容纳调试输出）
      return [...state.slice(-799), entry]
    }
    case 'CLEAR':
      return []
    default:
      return state
  }
}

interface TerminalLogContextValue {
  logs: TerminalLogEntry[]
  append: (entry: Omit<TerminalLogEntry, 'id' | 'timestamp'>) => void
  clear: () => void
}

const TerminalLogContext = createContext<TerminalLogContextValue | null>(null)

export function TerminalLogProvider({ children }: { children: ReactNode }) {
  const [logs, dispatch] = useReducer(terminalLogReducer, [])
  const append = useCallback(
    (entry: Omit<TerminalLogEntry, 'id' | 'timestamp'>) => dispatch({ type: 'APPEND', payload: entry }),
    []
  )
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), [])

  return (
    <TerminalLogContext.Provider value={{ logs, append, clear }}>
      {children}
    </TerminalLogContext.Provider>
  )
}

export function useTerminalLogs() {
  const ctx = useContext(TerminalLogContext)
  if (!ctx) throw new Error('useTerminalLogs must be used within TerminalLogProvider')
  return ctx
}