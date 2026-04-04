-- ─────────────────────────────────────────────────────────────────────────────
-- db/schema.sql — historical record only.
-- The live schema lives in Supabase (project: eywhrikvaagumcbsdsxm).
-- This file is NOT used for migrations or deployments.
-- New table/index additions are appended here as they are run in Supabase.
-- ─────────────────────────────────────────────────────────────────────────────


-- Spine v1 Schema
-- PostgreSQL

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- Papers
-- ─────────────────────────────────────────────

CREATE TABLE papers (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    arxiv_id     VARCHAR(20) UNIQUE NOT NULL,
    title        TEXT        NOT NULL,
    abstract     TEXT,
    authors      TEXT[],
    categories   TEXT[],
    published_at DATE,
    page_count   INT,          -- size proxy; used to normalize dwell time in signal scoring
    fetched_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_papers_published_at ON papers (published_at DESC);
CREATE INDEX idx_papers_categories   ON papers USING GIN (categories);


-- ─────────────────────────────────────────────
-- Users
-- ─────────────────────────────────────────────

CREATE TABLE users (
    id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    seed_topics  TEXT[] NOT NULL,   -- cold start; declared on onboarding
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────────
-- Reading Sessions
-- One row per (user, paper) reading attempt.
-- ─────────────────────────────────────────────

CREATE TABLE reading_sessions (
    id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID    NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    paper_id              UUID    NOT NULL REFERENCES papers(id)  ON DELETE CASCADE,
    started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at              TIMESTAMPTZ,
    stayed_in_app         BOOLEAN NOT NULL DEFAULT TRUE,  -- FALSE if user opened external PDF; key intent signal
    reached_past_abstract BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_sessions_user_id  ON reading_sessions (user_id);
CREATE INDEX idx_sessions_paper_id ON reading_sessions (paper_id);


-- ─────────────────────────────────────────────
-- Reading Events
-- Raw behavioral stream. Never modified after insert.
-- event_type values: scroll | section_enter | section_exit | external_open | blur | focus
-- ─────────────────────────────────────────────

CREATE TABLE reading_events (
    id          BIGSERIAL   PRIMARY KEY,
    session_id  UUID        NOT NULL REFERENCES reading_sessions(id) ON DELETE CASCADE,
    event_type  VARCHAR(30) NOT NULL,
    section     VARCHAR(100),         -- null for non-section events
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    payload     JSONB                 -- scroll_pct, viewport_pct, etc.
);

CREATE INDEX idx_events_session_id  ON reading_events (session_id);
CREATE INDEX idx_events_occurred_at ON reading_events (occurred_at);


-- ─────────────────────────────────────────────
-- Paper Signals
-- Computed summary per (user, paper). Written on session close.
-- Drives feed re-ranking. One row per user-paper pair.
-- ─────────────────────────────────────────────

CREATE TABLE paper_signals (
    user_id          UUID    NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    paper_id         UUID    NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    total_dwell_secs INT     NOT NULL DEFAULT 0,
    max_scroll_depth FLOAT   NOT NULL DEFAULT 0,  -- 0.0 to 1.0
    sections_visited TEXT[]  NOT NULL DEFAULT '{}',
    stayed_in_app    BOOLEAN NOT NULL DEFAULT TRUE,
    -- signal_score: normalized dwell (by page_count) * scroll_depth * in_app_multiplier
    -- computed by the application layer on session close, stored here for fast feed queries
    signal_score     FLOAT,
    last_read_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, paper_id)
);

CREATE INDEX idx_signals_user_score ON paper_signals (user_id, signal_score DESC);

-- New Additions 

-- Spine — user_access table
-- Paste this into the Supabase SQL editor to create the table.
--
-- This table controls who can enter the app.
-- role = 'dev'  → full admin access (admin panel, fetch trigger, stats)
-- role = 'user' → normal reading access
--
-- The dev access code can also be set via DEV_ACCESS_CODE env var (checked first,
-- never stored in DB). Use that for your own code so it never touches Supabase.

CREATE TABLE IF NOT EXISTS user_access (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code       VARCHAR(64)  UNIQUE NOT NULL,
    role       VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('dev', 'user')),
    label      TEXT,                        -- optional: who this code is for
    used_at    TIMESTAMPTZ,                 -- set on first successful use
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_access_code ON user_access (code);

-- ── Seed codes ────────────────────────────────────────────────────────────────
-- Replace or add codes as needed. The dev env-var code is separate and preferred.
-- Insert demo/user access codes here:

INSERT INTO user_access (code, role, label) VALUES
    ('SPINE-DEMO-A1', 'user', 'Demo user 1'),
    ('SPINE-DEMO-A2', 'user', 'Demo user 2'),
    ('SPINE-DEMO-A3', 'user', 'Demo user 3'),
    ('SPINE-DEMO-A4', 'user', 'Demo user 4'),
    ('SPINE-DEMO-A5', 'user', 'Demo user 5')
ON CONFLICT (code) DO NOTHING;

-- ── Notes ─────────────────────────────────────────────────────────────────────
-- Your personal dev code goes in .env as DEV_ACCESS_CODE=<your-code>
-- That way it never appears in the DB and can't be leaked via a Supabase export.
-- Any code stored here with role='dev' also works for admin access.


-- ─────────────────────────────────────────────
-- Section Signals
-- Per (user, paper, section) dwell aggregation. Written on session close.
-- Enables section-level affinity: "this user lingers on methodology sections".
-- Used to surface why a paper is ranked highly and to weight future recommendations.
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS section_signals (
    user_id     UUID         NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    paper_id    UUID         NOT NULL REFERENCES papers(id)  ON DELETE CASCADE,
    section     VARCHAR(100) NOT NULL,
    dwell_secs  INT          NOT NULL DEFAULT 0,
    visit_count INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, paper_id, section)
);

CREATE INDEX IF NOT EXISTS idx_section_signals_user ON section_signals (user_id);


-- ─────────────────────────────────────────────
-- Paper Tags
-- Structured tags per paper: limitations, contributions, methods, datasets.
-- Populated by lightweight extraction or admin tooling.
-- Powers limitation-aware recommendations:
--   "you finished X; here's Y which directly addresses its stated limitations."
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS paper_tags (
    paper_id    UUID        NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    tag_type    VARCHAR(30) NOT NULL,   -- 'limitation' | 'contribution' | 'method' | 'dataset'
    tag_value   TEXT        NOT NULL,
    confidence  FLOAT,                  -- 0.0–1.0 extraction confidence; NULL = manually added
    PRIMARY KEY (paper_id, tag_type, tag_value)
);

CREATE INDEX IF NOT EXISTS idx_paper_tags_paper ON paper_tags (paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_tags_type  ON paper_tags (tag_type);

