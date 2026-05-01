'use client'

import { cn } from '@/lib/utils'

interface SpinnerProps {
  className?: string
  size?: 'sm' | 'md'
}

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  return (
    <div
      className={cn(
        'inline-block border-2 border-terminal-border border-t-terminal-primary',
        size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5',
        className
      )}
      style={{ animation: 'blinkCursor 0.8s step-end infinite' }}
    />
  )
}