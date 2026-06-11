-- ============================================================
-- AI Training & RAG — Migração
-- Execute no Supabase SQL Editor (Dashboard > SQL Editor)
-- Pré-requisito: extensão pgvector deve estar disponível no plano
-- ============================================================

-- 1. Habilitar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 2. Fontes de treinamento ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_training_sources (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email       text        NOT NULL,
  source_type      text        NOT NULL,  -- 'text' | 'link' | 'file_pdf' | 'file_audio' | 'file_video' | 'carousel'
  title            text        NOT NULL,
  original_file_url text,
  original_text    text,
  processed_text   text,
  summary          text,
  topics           text[],
  keywords         text[],
  tone             text,
  target_audience  text,
  status           text        NOT NULL DEFAULT 'processing',  -- 'processing' | 'done' | 'error'
  error_msg        text,
  chunk_count      int         NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_sources_email  ON ai_training_sources (user_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_sources_status ON ai_training_sources (status);

-- ── 3. Chunks com embeddings (pgvector) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_training_chunks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  text        NOT NULL,
  source_id   uuid        NOT NULL REFERENCES ai_training_sources(id) ON DELETE CASCADE,
  chunk_text  text        NOT NULL,
  embedding   vector(768),           -- Gemini text-embedding-004 = 768 dims
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_chunks_email  ON ai_training_chunks (user_email);
CREATE INDEX IF NOT EXISTS idx_training_chunks_source ON ai_training_chunks (source_id);

-- HNSW index: works on empty tables, excellent recall/speed tradeoff
CREATE INDEX IF NOT EXISTS idx_training_chunks_hnsw
  ON ai_training_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ── 4. Perfil da IA do usuário ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_ai_profile (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email          text        UNIQUE NOT NULL,
  brand_voice         text,
  writing_style       text,
  preferred_structure text,
  forbidden_terms     text[],
  target_audience     text,
  main_topics         text[],
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── 5. Função de busca semântica ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_training_chunks(
  query_embedding   vector(768),
  match_user_email  text,
  match_count       int     DEFAULT 5,
  match_threshold   float   DEFAULT 0.4
)
RETURNS TABLE (
  id          uuid,
  source_id   uuid,
  chunk_text  text,
  metadata    jsonb,
  similarity  float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.source_id,
    c.chunk_text,
    c.metadata,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM ai_training_chunks c
  WHERE c.user_email = match_user_email
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ── 6. RLS — desabilitado (controlado via service_role na API) ─────────────
ALTER TABLE ai_training_sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_chunks  DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_profile     DISABLE ROW LEVEL SECURITY;

-- ── 7. Bucket de storage ──────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-training-sources',
  'ai-training-sources',
  false,
  26214400,  -- 25 MB
  ARRAY[
    'application/pdf',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
    'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/webm',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
ON CONFLICT (id) DO NOTHING;
