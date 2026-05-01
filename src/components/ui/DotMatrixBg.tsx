'use client'

import { useState, useEffect } from 'react'

export function VSCodeShell({ children }: { children: React.ReactNode }) {
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
        <span className="text-[11px] text-[#888] font-mono tracking-wide">
          CatStack — Visual Studio Code
        </span>
        <span className="text-[11px] text-[#888] font-mono" suppressHydrationWarning>
          {time}
        </span>
      </div>
      {children}
    </div>
  )
}