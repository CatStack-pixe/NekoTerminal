'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

// ================== 模型分类器 ==================
const MODEL_CATEGORIES = [
  { name: 'OpenAI', icon: '🤖', patterns: [/^gpt-/, /^o1-/, /^o3-/, /^chatgpt-/], color: '#10a37f' },
  { name: 'Claude', icon: '🧠', patterns: [/^claude-/], color: '#d97706' },
  { name: 'Gemini', icon: '💎', patterns: [/^gemini-/], color: '#4285f4' },
  { name: '通义千问', icon: '🔮', patterns: [/^qwen-/, /^qwq-/], color: '#ff6a00' },
  { name: 'DeepSeek', icon: '🔍', patterns: [/^deepseek-/], color: '#0066ff' },
  { name: 'Llama', icon: '🦙', patterns: [/^llama-/, /^meta-llama/, /^codellama-/], color: '#0081fb' },
  { name: 'Mistral', icon: '🌪️', patterns: [/^mistral-/, /^mixtral-/, /^codestral-/], color: '#ff7000' },
  { name: '智谱AI', icon: '📚', patterns: [/^glm-/, /^chatglm-/], color: '#1e40af' },
  { name: 'Moonshot', icon: '🌙', patterns: [/^moonshot-/, /^kimi-/], color: '#6366f1' },
  { name: 'Yi', icon: '🎯', patterns: [/^yi-/], color: '#8b5cf6' },
  { name: '图像生成', icon: '🎨', patterns: [/^dall-e-/, /^stable-/, /^midjourney/, /^sdxl/, /^flux-/], color: '#ec4899' },
  { name: '语音模型', icon: '🎤', patterns: [/^whisper-/, /^tts-/, /^bark/, /^suno-/], color: '#14b8a6' },
  { name: '代码模型', icon: '💻', patterns: [/^code-/, /^starcoder/, /^deepseek-coder/], color: '#22c55e' },
  { name: '其他模型', icon: '📦', patterns: [], color: '#6b7280' },
]

function classifyModels(modelList: string[]) {
  const result: { name: string; icon: string; color: string; models: string[] }[] = []
  const categorized = new Set<string>()

  for (const category of MODEL_CATEGORIES) {
    if (category.name === '其他模型') continue
    const matched: string[] = []
    for (const model of modelList) {
      if (categorized.has(model)) continue
      for (const pattern of category.patterns) {
        if (pattern.test(model)) {
          matched.push(model)
          categorized.add(model)
          break
        }
      }
    }
    if (matched.length > 0) {
      result.push({ ...category, models: matched.sort((a, b) => b.localeCompare(a)) })
    }
  }

  const uncategorized = modelList.filter((m) => !categorized.has(m)).sort()
  if (uncategorized.length > 0) {
    const other = MODEL_CATEGORIES.find((c) => c.name === '其他模型')!
    result.push({ ...other, models: uncategorized.sort((a, b) => b.localeCompare(a)) })
  }

  return result
}

function extractVersion(modelName: string): string | null {
  const versionMatch = modelName.match(/-(\d+(?:\.\d+)*)(?:-|$)/)
  if (versionMatch) return 'v' + versionMatch[1]
  const sizeMatch = modelName.match(/-(\d+b)(?:-|$)/i)
  if (sizeMatch) return sizeMatch[1].toUpperCase()
  const tags: string[] = []
  if (/preview/i.test(modelName)) tags.push('Preview')
  if (/latest/i.test(modelName)) tags.push('Latest')
  if (/instruct/i.test(modelName)) tags.push('Instruct')
  if (/chat/i.test(modelName)) tags.push('Chat')
  if (/turbo/i.test(modelName)) tags.push('Turbo')
  if (/mini/i.test(modelName)) tags.push('Mini')
  return tags.length > 0 ? tags.join(' · ') : null
}

function normalizeBaseUrl(url: string): string {
  return url
    .replace(/\/chat\/completions\/?$/, '')
    .replace(/\/models\/?$/, '')
    .replace(/\/$/, '')
}

// ================== 组件 ==================
interface ModelSelectorProps {
  isOpen: boolean
  onClose: () => void
  apiUrl: string
  apiKey: string
  currentModel?: string
  onSelect: (model: string) => void
}

export function ModelSelector({
  isOpen,
  onClose,
  apiUrl,
  apiKey,
  currentModel,
  onSelect,
}: ModelSelectorProps) {
  const [models, setModels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // 打开时自动拉取模型列表
  useEffect(() => {
    if (!isOpen) return
    if (!apiKey || !apiUrl) {
      setError('请先输入 API 密钥和地址')
      return
    }

    let cancelled = false

    async function fetchModels() {
      setLoading(true)
      setError(null)
      try {
        const baseUrl = normalizeBaseUrl(apiUrl)
        const response = await fetch(`${baseUrl}/models`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        })
        if (!response.ok) throw new Error(`获取失败: ${response.status}`)
        const data = await response.json()
        let list: string[] = []
        if (Array.isArray(data)) list = data
        else if (data.data) list = data.data
        else if (data.models) list = data.models

        const modelNames = list
          .map((m: unknown) => (typeof m === 'string' ? m : (m as Record<string, string>)?.id ?? ''))
          .filter(Boolean)
          .sort()

        if (!cancelled) setModels(modelNames)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchModels()
    return () => {
      cancelled = true
    }
  }, [isOpen, apiUrl, apiKey])

  const categories = classifyModels(models)
  const filteredCategories = search
    ? categories
        .map((cat) => ({
          ...cat,
          models: cat.models.filter((m) => m.toLowerCase().includes(search.toLowerCase())),
        }))
        .filter((cat) => cat.models.length > 0)
    : categories

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[5vh] px-5 pb-5"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[900px] max-h-[85vh] bg-[#0c0c14] border border-terminal-border flex flex-col shadow-[0_0_60px_rgba(0,212,255,0.08),0_20px_60px_rgba(0,0,0,0.6)] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-terminal-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-terminal-bright tracking-wider">
              ◆ 模型广场
            </span>
            <a
              href="https://vipapi.online/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-terminal-dim ml-2 no-underline hover:text-terminal-primary"
            >
              (点击此处查看更多)
            </a>
            <span className="font-mono text-[11px] text-terminal-dim ml-2 bg-terminal-primary/5 border border-terminal-border px-2 py-0.5">
              {models.length} 个模型
            </span>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-lg text-terminal-dim hover:text-[#ef4444] w-9 h-9 flex items-center justify-center border border-terminal-border bg-transparent cursor-pointer transition-colors"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-terminal-border shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="> 搜索模型名称..."
            className="w-full font-mono text-[13px] bg-[#0d0d18] text-terminal-text border border-terminal-border px-3.5 py-2.5 outline-none transition-colors placeholder:text-terminal-muted focus:border-terminal-primary/50 caret-terminal-primary"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-terminal-dim font-mono text-sm gap-3">
              <div className="w-3 h-3 bg-terminal-primary animate-pulse shadow-[0_0_12px_var(--color-terminal-primary)]" />
              <span>正在获取模型列表...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 text-[#ef4444] font-mono text-sm gap-2">
              <span className="text-5xl opacity-30">◈</span>
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && filteredCategories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-terminal-muted font-mono text-sm gap-3">
              <span className="text-5xl opacity-30">◈</span>
              <span>{search ? '未找到匹配的模型' : '暂无可用模型'}</span>
            </div>
          )}

          {!loading &&
            !error &&
            filteredCategories.map((category) => (
              <div key={category.name} className="mb-5 last:mb-0">
                <div className="flex items-center gap-2.5 mb-2.5 pb-2 border-b border-terminal-border">
                  <span className="w-8 h-8 flex items-center justify-center text-base bg-terminal-primary/5 border border-terminal-border">
                    {category.icon}
                  </span>
                  <span className="font-mono text-[13px] font-bold text-terminal-text tracking-wider uppercase">
                    {category.name}
                  </span>
                  <span className="font-mono text-[11px] text-terminal-muted ml-auto bg-terminal-elevated border border-terminal-border px-2 py-0.5">
                    {category.models.length}
                  </span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
                  {category.models.map((model) => {
                    const version = extractVersion(model)
                    const selected = model === currentModel
                    return (
                      <button
                        key={model}
                        onClick={() => {
                          onSelect(model)
                          onClose()
                        }}
                        className={cn(
                          'relative text-left font-mono text-xs px-3 py-2.5 border cursor-pointer transition-colors overflow-hidden',
                          'bg-terminal-elevated',
                          selected
                            ? 'border-terminal-primary bg-terminal-primary/5 shadow-[0_0_20px_rgba(0,212,255,0.12),inset_0_0_20px_rgba(0,212,255,0.03)]'
                            : 'border-terminal-border hover:border-terminal-primary hover:bg-terminal-primary/3'
                        )}
                      >
                        {selected && (
                          <span className="absolute top-2 right-2 text-[10px] text-terminal-primary drop-shadow-[0_0_6px_var(--color-terminal-primary)]">
                            ◆
                          </span>
                        )}
                        <span
                          className={cn(
                            'block font-semibold break-all leading-[1.4]',
                            selected ? 'text-terminal-primary' : 'text-terminal-text'
                          )}
                        >
                          {model}
                        </span>
                        {version && (
                          <span className="block mt-1 text-[10px] text-terminal-muted">
                            {version}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}