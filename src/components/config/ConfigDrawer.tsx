'use client'

import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ModelSelector } from './ModelSelector'
import type { Conversation } from '@/types'

const DEFAULT_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4O' },
  { value: 'gpt-4o-mini', label: 'GPT-4O-MINI' },
  { value: 'claude-3.5-sonnet', label: 'CLAUDE 3.5' },
  { value: 'gemini-1.5-pro', label: 'GEMINI 1.5' },
]

interface ConfigDrawerProps {
  isOpen: boolean
  onClose: () => void
  conversation?: Conversation | null
  onSave?: (data: {
    title: string
    model: string
    apiUrl: string
    apiKey: string
    systemPrompt: string
  }) => void
}

export function ConfigDrawer({
  isOpen,
  onClose,
  conversation,
  onSave,
}: ConfigDrawerProps) {
  const [title, setTitle] = useState(conversation?.title ?? '')
  const [model, setModel] = useState(conversation?.model ?? 'gpt-4o-mini')
  const [apiUrl, setApiUrl] = useState(
    conversation?.api_url ?? 'https://api.openai.com/v1'
  )
  const [apiKey, setApiKey] = useState(conversation?.api_key ?? '')
  const [systemPrompt, setSystemPrompt] = useState(
    conversation?.system_prompt ?? ''
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSave?.({ title, model, apiUrl, apiKey, systemPrompt })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="SYSTEM CONFIGURATION"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="font-mono text-[10px] text-terminal-dim uppercase tracking-wider">
            Channel Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Channel"
          />
        </div>

        <ModelSelector
          models={DEFAULT_MODELS}
          value={model}
          onChange={setModel}
        />

        <div className="space-y-1">
          <label className="font-mono text-[10px] text-terminal-dim uppercase tracking-wider">
            API Endpoint
          </label>
          <Input
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
          />
        </div>

        <div className="space-y-1">
          <label className="font-mono text-[10px] text-terminal-dim uppercase tracking-wider">
            API Key
          </label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
        </div>

        <div className="space-y-1">
          <label className="font-mono text-[10px] text-terminal-dim uppercase tracking-wider">
            System Prompt
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={3}
            className="w-full resize-none font-mono text-sm bg-terminal-elevated text-terminal-text border border-terminal-border px-2.5 py-1.5 outline-none transition-colors placeholder:text-terminal-dim/40 focus:border-terminal-primary/50"
            placeholder="You are a helpful assistant..."
          />
        </div>

        <Button type="submit" variant="primary" className="w-full">
          SAVE CONFIGURATION
        </Button>
      </form>
    </Modal>
  )
}