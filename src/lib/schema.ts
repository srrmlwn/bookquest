// BookQuest schema. Applied automatically (CREATE ... IF NOT EXISTS) on first request.
export const SCHEMA = `
-- Every row carries family_id so multi-family accounts are a small change later.

CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  cookie_secret TEXT NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  age_band TEXT NOT NULL,          -- '4-5' | '6-7' | '8-9'
  reading_mode TEXT NOT NULL,      -- 'independent' | 'together'
  color TEXT NOT NULL DEFAULT 'teal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  cover TEXT,                      -- small JPEG data URL, resized on the device
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,  -- up to 2 grown-up questions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  goal INT NOT NULL,
  reward TEXT NOT NULL,
  reward_emoji TEXT NOT NULL DEFAULT '🎁',
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'archived'
  reward_given_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quest_books (
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  PRIMARY KEY (quest_id, book_id)
);

CREATE TABLE IF NOT EXISTS completions (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quest_id, book_id)
);

CREATE INDEX IF NOT EXISTS completions_child_idx ON completions (child_id, created_at DESC);
`;
