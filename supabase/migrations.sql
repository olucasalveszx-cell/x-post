-- ============================================================
-- Netpost — Migração completa de banco de dados
-- Execute no Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ── 1. Biblioteca de imagens geradas por IA (por usuário) ──────────────────
CREATE TABLE IF NOT EXISTS ai_image_library (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email   text NOT NULL,
  storage_path text NOT NULL,          -- caminho no bucket "ai-library"
  public_url   text NOT NULL,
  prompt       text,
  model        text,                   -- ex: "flux-kontext", "dall-e-3"
  width        int,
  height       int,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_library_email ON ai_image_library (user_email, created_at DESC);

-- ── 2. Biblioteca global (admin publica, todos lêem) ───────────────────────
CREATE TABLE IF NOT EXISTS global_image_library (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email  text NOT NULL,
  storage_path text NOT NULL,          -- caminho no bucket "global-ai-library"
  public_url   text NOT NULL,
  title        text,
  tags         text[],
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_library_tags  ON global_image_library USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_global_library_date  ON global_image_library (created_at DESC);

-- ── 3. Fotos pessoais do usuário ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_personal_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email   text NOT NULL,
  storage_path text NOT NULL,          -- caminho no bucket "personal-photos"
  public_url   text NOT NULL,
  filename     text,
  size_bytes   int,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_photos_email ON user_personal_photos (user_email, created_at DESC);

-- ── 4. RLS (Row Level Security) ────────────────────────────────────────────
-- Usamos service_role no server — RLS é camada extra de segurança.
-- Como não usamos Supabase Auth, desativamos RLS e controlamos via API.

ALTER TABLE ai_image_library      DISABLE ROW LEVEL SECURITY;
ALTER TABLE global_image_library  DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_personal_photos  DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- BUCKETS DE STORAGE
-- Execute separado ou junto (Supabase cria via SQL também)
-- ============================================================

-- Bucket: imagens geradas por IA (por usuário, privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-library',
  'ai-library',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: biblioteca global (admin publica, todos lêem)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'global-ai-library',
  'global-ai-library',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: fotos pessoais do usuário (privado — acesso via signed URL ou service role)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'personal-photos',
  'personal-photos',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: fotos de rosto de referência (para geração de imagem personalizada)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reference-faces',
  'reference-faces',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ── Storage policies (buckets públicos permitem leitura anônima) ────────────

-- ai-library: leitura pública, escrita só via service_role (API)
CREATE POLICY "ai-library: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ai-library');

-- global-ai-library: leitura pública
CREATE POLICY "global-ai-library: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'global-ai-library');
