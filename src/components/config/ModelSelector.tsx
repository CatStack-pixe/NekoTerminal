'use client'

import { cn } from '@/lib/utils'

interface ModelOption {
  value: string
  label: string
}

interface ModelSelectorProps {
  models: ModelOption[]
  value?: string
  onChange?: (value: string) => void
  className?: string
}

export function ModelSelector({
  models,
  value,
  onChange,
  className,
}: ModelSelectorProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="font-mono text-[10px] text-terminal-dim uppercase tracking-wider">
        Model
      </label>
      <div className="flex flex-wrap gap-1.5">
        {models.map((model) => (
          <button
            key={model.value}
            onClick={() => onChange?.(model.value)}
            className={cn(
              'font-mono text-xs px-3 py-1.5 border transition-colors duration-100',
              'cursor-pointer',
              value === model.value
                ? 'border-terminal-primary/40 bg-terminal-primary/10 text-terminal-primary'
                : 'border-terminal-border text-terminal-dim hover:text-terminal-text hover:border-terminal-border-bright'
            )}
          >
            {model.label}
          </button>
        ))}
      </div>
    </div>
  )
}