-- Tatkal Rush leaderboard. Paste into the Supabase SQL editor, then put the
-- project URL and anon key into js/config.js.

create table if not exists public.tatkal_scores (
  id bigint generated always as identity primary key,
  name text not null check (name ~ '^[A-Za-z0-9._ ]{2,16}$'),
  score integer not null check (score between 1 and 30000),
  tickets integer not null check (tickets between 0 and 60),
  perfect integer not null default 0 check (perfect between 0 and 60),
  mode text not null check (mode in ('full', 'express')),
  created_at timestamptz not null default now()
);

create index if not exists tatkal_scores_top_idx
  on public.tatkal_scores (mode, score desc, tickets desc, created_at asc);

alter table public.tatkal_scores enable row level security;

create policy "public read" on public.tatkal_scores
  for select to anon using (true);

-- Sanity caps double as a cheap anti-cheat: a big perfect VIP ticket with a full
-- streak tops out near 700 points, and nobody books faster than one ticket per 12 seconds.
create policy "public insert" on public.tatkal_scores
  for insert to anon with check (
    name ~ '^[A-Za-z0-9._ ]{2,16}$'
    and score between 1 and 30000
    and tickets >= 1
    and score <= tickets * 700
    and perfect <= tickets
    and ((mode = 'full' and tickets <= 50) or (mode = 'express' and tickets <= 15))
  );

-- Best run per name and mode, all time.
create or replace view public.tatkal_board
with (security_invoker = true) as
select distinct on (lower(name), mode)
  name, mode, score, tickets, perfect, created_at
from public.tatkal_scores
order by lower(name), mode, score desc, tickets desc, created_at asc;

-- Best run per name and mode, today (India time).
create or replace view public.tatkal_board_today
with (security_invoker = true) as
select distinct on (lower(name), mode)
  name, mode, score, tickets, perfect, created_at
from public.tatkal_scores
where (created_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date
order by lower(name), mode, score desc, tickets desc, created_at asc;

grant select on public.tatkal_board to anon;
grant select on public.tatkal_board_today to anon;
