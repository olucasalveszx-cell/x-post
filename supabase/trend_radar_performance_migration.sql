-- ============================================================
-- Trend Radar + Performance Loop — XPost
-- ============================================================

-- Previsões de tendências (Feature 4)
CREATE TABLE IF NOT EXISTS trend_predictions (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  topic               TEXT        NOT NULL,
  category            TEXT        NOT NULL DEFAULT 'geral',
  confidence          INTEGER     NOT NULL DEFAULT 0,
  reasoning           TEXT,
  signals             TEXT[]      NOT NULL DEFAULT '{}',
  predicted_for_hours INTEGER     NOT NULL DEFAULT 24,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trend_pred_created    ON trend_predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_pred_confidence ON trend_predictions(confidence DESC);

-- Performance dos conteúdos gerados (Feature 5)
CREATE TABLE IF NOT EXISTS content_performance (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email      TEXT        NOT NULL,
  ig_media_id     TEXT        NOT NULL,
  content_type    TEXT        NOT NULL DEFAULT 'carousel',
  category        TEXT,
  news_id         UUID        REFERENCES news_cache(id) ON DELETE SET NULL,
  hook            TEXT,
  likes           INTEGER     NOT NULL DEFAULT 0,
  comments        INTEGER     NOT NULL DEFAULT 0,
  saves           INTEGER     NOT NULL DEFAULT 0,
  reach           INTEGER     NOT NULL DEFAULT 0,
  engagement_rate FLOAT       NOT NULL DEFAULT 0,
  synced_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_email, ig_media_id)
);

CREATE INDEX IF NOT EXISTS idx_content_perf_user        ON content_performance(user_email, engagement_rate DESC);
CREATE INDEX IF NOT EXISTS idx_content_perf_media       ON content_performance(ig_media_id);
CREATE INDEX IF NOT EXISTS idx_content_perf_created     ON content_performance(created_at DESC);
