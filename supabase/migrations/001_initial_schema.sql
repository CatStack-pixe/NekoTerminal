-- CatStack Initial Database Schema
-- 明日方舟终端风格聊天室 - Supabase PostgreSQL

-- 扩展：生成 UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== 用户配置表 ====================
CREATE TABLE public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username    TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==================== 对话表 ====================
CREATE TABLE public.conversations (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title         TEXT NOT NULL DEFAULT 'CatStack 新对话',
    model         TEXT NOT NULL DEFAULT 'gemini-3.1-pro-preview',
    api_url       TEXT NOT NULL DEFAULT 'https://vipapi.online/v1',
    api_key       TEXT,
    system_prompt TEXT,
    is_archived   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_user_updated 
    ON public.conversations(user_id, updated_at DESC);

-- ==================== 消息表 ====================
CREATE TABLE public.messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
    content         TEXT NOT NULL,
    image_url       TEXT,
    image_width     INT,
    image_height    INT,
    token_count     INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation_created 
    ON public.messages(conversation_id, created_at DESC);

-- ==================== Row Level Security (RLS) ====================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 用户只能读写自己的 profile
CREATE POLICY "Users can manage own profile"
    ON public.profiles FOR ALL
    USING (auth.uid() = id);

-- 用户只能读写自己的对话
CREATE POLICY "Users can manage own conversations"
    ON public.conversations FOR ALL
    USING (auth.uid() = user_id);

-- 用户只能读写自己对话中的消息
CREATE POLICY "Users can manage messages in own conversations"
    ON public.messages FOR ALL
    USING (
        auth.uid() = (
            SELECT user_id FROM public.conversations 
            WHERE id = messages.conversation_id
        )
    );

-- ==================== 触发器 ====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();