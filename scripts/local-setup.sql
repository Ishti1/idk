CREATE TABLE IF NOT EXISTS replies (
  id text PRIMARY KEY NOT NULL,
  coffee text NOT NULL,
  date text,
  updated_at integer NOT NULL
);
CREATE TABLE IF NOT EXISTS plans (
  reply_id text PRIMARY KEY NOT NULL,
  place text NOT NULL,
  day text NOT NULL DEFAULT '',
  time text NOT NULL DEFAULT ''
);
