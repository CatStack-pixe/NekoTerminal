// ==================== 数据库模型 ====================

export interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface ProviderConfig {
  provider: string
  name: string
  apiUrl: string
  apiKeys: string[]
  /** 预设模型列表（该厂商的推荐模型） */
  models?: string[]
  /** 当前选中（活跃）的 Key 索引，用于轮询追踪 */
  keyIndex?: number
  /** 厂商标识色 */
  color?: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  model: string
  api_url: string
  api_key: string | null
  system_prompt: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
  provider_configs?: ProviderConfig[] | null
}

export type MessageRole = 'system' | 'user' | 'assistant'

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  token_count: number | null
  created_at: string
}

// ==================== API 请求/响应类型 ====================

export interface CreateConversationPayload {
  title?: string
  model?: string
  api_url?: string
  api_key?: string
  system_prompt?: string
}

export interface UpdateConversationPayload {
  title?: string
  model?: string
  api_url?: string
  api_key?: string
  system_prompt?: string
  is_archived?: boolean
}

export interface ChatRequestMessage {
  role: MessageRole
  content: string
}

export interface ChatRequest {
  conversationId: string
  messages: ChatRequestMessage[]
  model: string
  apiUrl: string
  apiKey: string
}

export interface ChatStreamChunk {
  content: string
}

export interface PaginatedResponse<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

// ==================== 组件 Props 类型 ====================

export interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
}

export interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

// ==================== 模型分类器类型 ====================

export interface ModelCategory {
  name: string
  icon: string
  color: string
  patterns: RegExp[]
  models?: string[]
}

export interface CategorizedModels {
  name: string
  icon: string
  color: string
  models: string[]
}