'use client'

import { useState, useRef, type KeyboardEvent, type ChangeEvent } from 'react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (content: string) => void
  onImageUpload?: (file: File) => void
  isStreaming?: boolean
  disabled?: boolean
}

export function ChatInput({
  onSend,
  onImageUpload,
  isStreaming,
  disabled,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    onSend(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isStreaming) handleSend()
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onImageUpload) {
      onImageUpload(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="border-t border-terminal-border bg-terminal-bg">
      <div className="flex items-center px-2 py-1.5 gap-1">
        {/* 前缀提示符 */}
        <span className="font-mono text-xs text-terminal-dim shrink-0">
          {'>'}
        </span>

        {/* 输入框 */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isStreaming ? 'Awaiting response...' : 'Type your transmission...'
          }
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent border-none outline-none font-mono text-sm text-terminal-text placeholder:text-terminal-dim/40 px-1.5 py-1',
            (disabled || isStreaming) ? 'opacity-50' : ''
          )}
        />

        {/* 图片上传按钮 */}
        {onImageUpload && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="font-mono text-xs text-terminal-dim hover:text-terminal-primary px-1.5 py-1 transition-colors disabled:opacity-30"
            disabled={disabled}
          >
            [+]
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

          {/* 发送按钮 */}
          <button
            onClick={handleSend}
            disabled={disabled || isStreaming || !input.trim()}
            title={isStreaming ? 'AI is responding...' : 'Send message'}
          className="font-mono text-xs text-terminal-primary/70 hover:text-terminal-primary px-2 py-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isStreaming ? '■' : '↵'}
        </button>
      </div>
    </div>
  )
}