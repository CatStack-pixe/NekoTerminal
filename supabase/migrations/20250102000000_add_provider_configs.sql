-- ============================================================
-- 迁移：为 conversations 表添加 provider_configs 字段
-- ============================================================

-- 添加 JSONB 字段存储多厂商配置
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS provider_configs JSONB DEFAULT NULL;