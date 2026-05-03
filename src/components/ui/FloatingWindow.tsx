'use client'

import { useState, useRef, useEffect, type ReactNode, type MouseEvent } from 'react'

// Inline cn utility to avoid dependency on @/lib/utils
function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

interface FloatingWindowProps {
  id: string
  title: string
  children: ReactNode
  className?: string
  defaultX?: number
  defaultY?: number
  defaultWidth?: number
  defaultHeight?: number
  isActive?: boolean
  onFocus?: (id: string) => void
  onClose?: (id: string) => void
}

export function FloatingWindow({
  id,
  title,
  children,
  className,
  defaultX = 100,
  defaultY = 80,
  defaultWidth = 480,
  defaultHeight = 360,
  isActive = false,
  onFocus,
  onClose,
}: FloatingWindowProps) {
  const [pos, setPos] = useState({ x: defaultX, y: defaultY })
  const [isMaximized, setIsMaximized] = useState(false)
  const restorePos = useRef({ x: defaultX, y: defaultY, w: defaultWidth, h: defaultHeight })
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  // Global mouse listeners for drag — properly cleaned up
  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!dragging.current) return
      setPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      })
    }
    const handleMouseUp = () => {
      dragging.current = false
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-window-btn]')) return
    dragging.current = true
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    onFocus?.(id)
  }

  const handleMaximize = () => {
    if (isMaximized) {
      setPos({ x: restorePos.current.x, y: restorePos.current.y })
      setIsMaximized(false)
    } else {
      restorePos.current = { x: pos.x, y: pos.y, w: defaultWidth, h: defaultHeight }
      setPos({ x: 0, y: 0 })
      setIsMaximized(true)
    }
  }

  const winW = isMaximized ? '100vw' : defaultWidth
  const winH = isMaximized ? '100vh' : defaultHeight

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col overflow-hidden',
        'font-mono text-xs',
        'shadow-2xl shadow-black/60',
        'transition-shadow duration-200',
        isActive ? 'shadow-black/80 ring-1 ring-[#569cd6]/30' : '',
        className
      )}
      style={{
        left: pos.x,
        top: pos.y,
        width: winW,
        height: winH,
        borderRadius: '10px',
      }}
      onClick={() => onFocus?.(id)}
    >
      {/* 外层黑色边框 */}
      <div className="absolute inset-0 rounded-[10px] border border-[#1a1a1a] pointer-events-none z-10" />

      {/* 标题栏 — macOS 风格 */}
      <div
        className={cn(
          'h-9 flex items-center px-3 shrink-0 select-none relative z-20',
          'bg-gradient-to-b from-[#2d2d30] to-[#252526]',
          'border-b border-[#1a1a1a]',
          'cursor-grab active:cursor-grabbing'
        )}
        onMouseDown={handleMouseDown}
      >
        {/* macOS 风格三色按钮 */}
        <div className="flex items-center gap-1.5 shrink-0 mr-3">
          <button
            data-window-btn
            onClick={() => onClose?.(id)}
            className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e] hover:brightness-110 transition-all duration-150 flex items-center justify-center group"
            title="Close"
          >
            <svg className="w-1.5 h-1.5 text-[#4c0000] opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 10 10">
              <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button
            data-window-btn
            className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] hover:brightness-110 transition-all duration-150 flex items-center justify-center group"
            title="Minimize"
          >
            <svg className="w-1.5 h-1.5 text-[#995700] opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 10 10">
              <path d="M2 5h6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button
            data-window-btn
            onClick={handleMaximize}
            className="w-3 h-3 rounded-full bg-[#28ca41] border border-[#17a82f] hover:brightness-110 transition-all duration-150 flex items-center justify-center group"
            title="Maximize"
          >
            <svg className="w-1.5 h-1.5 text-[#006500] opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 10 10">
              <path d="M1 1v8h8V1H1zm1 1h6v6H2V2z" fill="currentColor" />
            </svg>
          </button>
        </div>

        {/* 窗口标题 */}
        <div className="flex-1 text-center min-w-0">
          <span className="text-[11px] text-[#cccccc]/80 truncate tracking-wider font-medium select-none">
            {title}
          </span>
        </div>

        {/* 右侧占位保持居中 */}
        <div className="w-[52px] shrink-0" />
      </div>

      {/* 内容区 — 带顶部内阴影 */}
      <div className="flex-1 overflow-auto bg-[#1e1e1e] relative z-20"
        style={{
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
        }}
      >
        {children}
      </div>

      {/* 底部状态条 — 升级为渐变 */}
      <div className="h-5 bg-gradient-to-r from-[#007acc] to-[#3794ff] flex items-center px-3 shrink-0 relative z-20 gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
          <span className="text-[9px] text-white/70 font-mono">{id}</span>
        </div>
        <div className="flex-1" />
        <span className="text-[9px] text-white/60 font-mono">
          {winW}×{winH}
        </span>
        <span className="text-[9px] text-white/40">|</span>
        <span className="text-[9px] text-white/60 font-mono">
          {isActive ? 'FOCUSED' : 'BG'}
        </span>
      </div>

      {/* 毛玻璃 backdrop — 窗口不活动时稍微透明 */}
      {!isActive && (
        <div className="absolute inset-0 bg-black/10 pointer-events-none z-30 rounded-[10px]" />
      )}
    </div>
  )
}