'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/Input'
import { ModelSelector } from './ModelSelector'
import type { Conversation } from '@/types'
import { cn } from '@/lib/utils'

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
  const [apiUrl, setApiUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)

  // 同步外部 conversation 数据进来
  useEffect(() => {
    if (conversation) {
      setApiUrl(conversation.api_url ?? '')
      setApiKey(conversation.api_key ?? '')
      setModel(conversation.model ?? '')
      setSystemPrompt(conversation.system_prompt ?? '')
    }
  }, [conversation])

  // 实时保存：任一字段变化即写入 conversation
  const save = useCallback(
    (field: string, value: string) => {
      if (!conversation) return
      const data: Record<string, string> = {}
      data[field] = value
      // 将当前所有值一并提交
      const payload = {
        title: conversation.title,
        model: field === 'model' ? value : model,
        apiUrl: field === 'apiUrl' ? value : apiUrl,
        apiKey: field === 'apiKey' ? value : apiKey,
        systemPrompt: field === 'systemPrompt' ? value : systemPrompt,
      }
      // 同步本地状态
      if (field === 'apiUrl') setApiUrl(value)
      if (field === 'apiKey') setApiKey(value)
      if (field === 'model') setModel(value)
      if (field === 'systemPrompt') setSystemPrompt(value)
      onSave?.(payload)
    },
    [conversation, apiUrl, apiKey, model, systemPrompt, onSave]
  )

  // 处理模型选择
  const handleModelSelect = useCallback(
    (selectedModel: string) => {
      setModel(selectedModel)
      if (conversation) {
        onSave?.({
          title: conversation.title,
          model: selectedModel,
          apiUrl,
          apiKey,
          systemPrompt,
        })
      }
    },
    [conversation, apiUrl, apiKey, systemPrompt, onSave]
  )

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  return (
    <>
      {/* 遮罩 */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* 抽屉 */}
      <div
        className={cn(
          'fixed top-0 z-50 h-full w-full max-w-[400px] sm:max-w-[420px]',
          'bg-[#0c0c14] border-l border-terminal-border',
          'flex flex-col shadow-[-8px_0_40px_rgba(0,0,0,0.5)]',
          'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          isOpen ? 'right-0' : '-right-[420px] sm:-right-[420px]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[18px] py-4 border-b border-terminal-border shrink-0">
          <span className="font-mono text-[15px] font-bold text-terminal-bright tracking-wider text-shadow-[0_0_10px_rgba(0,212,255,0.15)]">
            ⚙ 当前对话配置
          </span>
          <button
            onClick={onClose}
            className="font-mono text-lg text-terminal-dim hover:text-[#ef4444] w-9 h-9 flex items-center justify-center border border-terminal-border bg-transparent cursor-pointer transition-colors hover:shadow-[0_0_10px_rgba(239,68,68,0.2)] active:bg-[rgba(239,68,68,0.1)]"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-[18px] py-[18px] flex flex-col gap-[18px]">
          {/* API 地址 */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs font-semibold text-terminal-dim uppercase tracking-wider">
              API 地址
            </label>
            <Input
              value={apiUrl}
              onChange={(e) => save('apiUrl', e.target.value)}
              placeholder="https://vipapi.online/v1"
            />
            <div className="font-mono text-[11px] text-terminal-muted tracking-wide">
              上方框直接填入:{' '}
              <a
                href="https://vipapi.online/register?aff=SK6V"
                target="_blank"
                rel="noopener noreferrer"
                className="text-terminal-primary hover:underline"
              >
                https://vipapi.online/register?aff=SK6V
              </a>
            </div>
          </div>

          {/* API 密钥 */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs font-semibold text-terminal-dim uppercase tracking-wider">
              API 秘钥 (可点击上方链接获取)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => save('apiKey', e.target.value)}
              placeholder="sk-......"
              className="w-full font-mono text-[13px] bg-[#0d0d18] text-terminal-text border border-terminal-border px-2.5 py-2.5 outline-none transition-colors placeholder:text-terminal-muted focus:border-terminal-primary/50 caret-terminal-primary"
            />
            <div className="font-mono text-[11px] text-terminal-muted tracking-wide">
              所有信息仅保存在数据库中
            </div>
          </div>

          {/* 模型 */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs font-semibold text-terminal-dim uppercase tracking-wider">
              模型 (推荐默认配置，也可点击获取后自行切换)
            </label>
            <div className="flex gap-2.5">
              <input
                type="text"
                value={model}
                readOnly
                placeholder="点击获取后选择模型"
                className="flex-1 font-mono text-[13px] bg-[#0d0d18] text-terminal-text border border-terminal-border px-2.5 py-2.5 outline-none cursor-default placeholder:text-terminal-muted"
              />
              <button
                onClick={() => setModelSelectorOpen(true)}
                className="font-mono text-xs font-semibold tracking-wider uppercase whitespace-nowrap px-4 py-2.5 border border-[#7cff4f] text-[#7cff4f] bg-transparent cursor-pointer transition-all hover:bg-[rgba(124,255,79,0.1)] hover:shadow-[0_0_15px_rgba(124,255,79,0.2)] active:bg-[rgba(124,255,79,0.15)]"
              >
                获取
              </button>
            </div>
            <div className="font-mono text-[11px] text-terminal-muted tracking-wide">
              推荐: grok-4.2
            </div>
          </div>

          {/* 系统提示词 */}
          <div className="flex flex-col gap-1.5 flex-1 min-h-0">
            <label className="font-mono text-xs font-semibold text-terminal-dim uppercase tracking-wider">
              系统提示词
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => save('systemPrompt', e.target.value)}
              placeholder="设定AI的角色、性格或背景......"
              className="flex-1 w-full min-h-[300px] resize-y font-mono text-[13px] leading-relaxed bg-[#0d0d18] text-terminal-text border border-terminal-border px-2.5 py-2.5 outline-none transition-colors placeholder:text-terminal-muted focus:border-terminal-primary/50 caret-terminal-primary"
            />
          </div>
        </div>
      </div>

      {/* 模型广场选择器 */}
      <ModelSelector
        isOpen={modelSelectorOpen}
        onClose={() => setModelSelectorOpen(false)}
        apiUrl={apiUrl}
        apiKey={apiKey}
        currentModel={model}
        onSelect={handleModelSelect}
      />
    </>
  )
}