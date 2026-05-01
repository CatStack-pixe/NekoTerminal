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
    dragging.current = true
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    onFocus?.(id)
  }

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col',
        'bg-[#1e1e1e] border',
        'font-mono text-xs',
        isActive ? 'border-[#569cd6]/60' : 'border-[#3c3c3c]',
        'shadow-2xl',
        className
      )}
      style={{
        left: pos.x,
        top: pos.y,
        width: defaultWidth,
        height: defaultHeight,
      }}
      onClick={() => onFocus?.(id)}
    >
      {/* 标题栏 */}
      <div
        className={cn(
          'h-7 flex items-center justify-between px-3 shrink-0 select-none cursor-grab active:cursor-grabbing',
          isActive ? 'bg-[#323233]' : 'bg-[#252526]'
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="text-[11px] text-[#cccccc] truncate">{title}</span>
        </div>
        <button
          onClick={() => onClose?.(id)}
          className="text-[11px] text-[#888] hover:text-[#f44747] transition-colors shrink-0 ml-2 px-1"
        >
          ✕
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto bg-[#1e1e1e]">
        {children}
      </div>

      {/* 底部状态条 */}
      <div className="h-4 bg-[#007acc] flex items-center px-2 shrink-0">
        <span className="text-[10px] text-white/70">{id}</span>
        <div className="flex-1" />
        <span className="text-[10px] text-white/70">
          {defaultWidth}×{defaultHeight}
        </span>
      </div>
    </div>
  )
}