'use client'

import { useState, useEffect } from 'react'

interface VSCodeShellProps {
  children: React.ReactNode
  /** 连接状态 */
  connectionStatus?: 'idle' | 'connecting' | 'streaming' | 'error'
}

export function VSCodeShell({ children, connectionStatus = 'idle' }: VSCodeShellProps) {
  const [time, setTime] = useState('--:--:--')

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e]">
      {/* VS Code 风格标题栏 */}
      <div className="h-8 bg-[#323233] flex items-center justify-between px-4 shrink-0 select-none">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-3">
          {/* 连接状态指示灯 */}
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor:
                connectionStatus === 'streaming' ? '#28c840' :
                connectionStatus === 'connecting' ? '#febc2e' :
                connectionStatus === 'error' ? '#ff5f57' :
                '#555',
              boxShadow:
                connectionStatus === 'streaming' ? '0 0 6px #28c840' :
                connectionStatus === 'connecting' ? '0 0 6px #febc2e' :
                connectionStatus === 'error' ? '0 0 6px #ff5f57' :
                'none',
              transition: 'all 0.3s ease',
            }}
            title={
              connectionStatus === 'idle' ? 'IDLE' :
              connectionStatus === 'connecting' ? 'CONNECTING' :
              connectionStatus === 'streaming' ? 'STREAMING' :
              'ERROR'
            }
          />
          <span className="text-[11px] text-[#888] font-mono tracking-wide">
            CatStack — Visual Studio Code
          </span>
        </div>
        <span className="text-[11px] text-[#888] font-mono" suppressHydrationWarning>
          {time}
        </span>
      </div>
      {children}
    </div>
  )
}