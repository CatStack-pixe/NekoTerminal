'use client'

import { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'font-mono text-sm bg-terminal-elevated text-terminal-text',
        'border border-terminal-border px-2.5 py-1.5',
        'outline-none transition-colors duration-150',
        'placeholder:text-terminal-dim/60',
        'focus:border-terminal-primary/50',
        className
      )}
      {...props}
    />
  )
}