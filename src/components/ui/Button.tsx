'use client'

import { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost'
}

export function Button({
  variant = 'default',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'font-mono text-xs tracking-wider px-3 py-1.5 transition-all duration-150',
        'border border-terminal-border',
        variant === 'primary' &&
          'bg-terminal-primary/10 border-terminal-primary/40 text-terminal-primary hover:bg-terminal-primary/20',
        variant === 'ghost' && 'border-transparent hover:bg-white/5',
        variant === 'default' &&
          'bg-transparent hover:bg-white/5 hover:border-terminal-border-bright',
        'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}