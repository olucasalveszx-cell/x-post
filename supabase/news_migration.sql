-- ============================================================
-- Central de Notícias e Tendências — XPost
-- ============================================================

-- Tabela principal de cache de notícias
CREATE TABLE IF NOT EXISTS news_cache (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT        NOT NULL,
  description  TEXT,
  content      TEXT,
  source       TEXT        NOT NULL DEFAULT '',
  source_url   TEXT        NOT NULL DEFAULT '',
  image_url    TEXT,
  category     TEXT        NOT NULL DEFAULT 'geral',
  keywords     TEXT[]      NOT NULL DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  viral_score  INTEGER     NOT NULL DEFAULT 0,
  viral_label  TEXT        NOT NULL DEFAULT 'nichado',
  UNIQUE(title)
);

-- Tópicos em tendência
CREATE TABLE IF NOT EXISTS trending_topics (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title            TEXT        NOT NULL,
  category         TEXT        NOT NULL DEFAULT 'geral',
  source           TEXT        NOT NULL DEFAULT 'xpost',
  growth_score     INTEGER     NOT NULL DEFAULT 0,
  engagement_score INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notícias salvas pelos usuários
CREATE TABLE IF NOT EXISTS saved_news (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    TEXT        NOT NULL,
  news_id    UUID        NOT NULL REFERENCES news_cache(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, news_id)
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_news_category_viral  ON news_cache(category, viral_score DESC);
CREATE INDEX IF NOT EXISTS idx_news_category_date   ON news_cache(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_created         ON news_cache(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_score       ON trending_topics(growth_score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_created     ON trending_topics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_user           ON saved_news(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_news_id        ON saved_news(news_id);
