-- Supabase schema for Real or Fake? leaderboard.
-- Apply once the SUPABASE_* env vars are wired up and the in-memory store
-- in lib/scores/store.ts is replaced with a Supabase-backed implementation.

create table if not exists scores (
  id          uuid primary key default gen_random_uuid(),
  initials    text not null check (char_length(initials) between 1 and 3),
  streak      integer not null check (streak >= 0),
  created_at  timestamptz not null default now()
);

create index if not exists scores_streak_idx on scores (streak desc, created_at asc);

-- Row Level Security: allow public read, public insert, no update/delete.
alter table scores enable row level security;

create policy "public read" on scores
  for select using (true);

create policy "public insert" on scores
  for insert with check (true);
