-- AI Career Coach schema. Run in the Supabase SQL editor (or `supabase db push`).
-- Access model: ONLY the API server touches these tables, using the service-role key, and it always filters by user_id
-- (Clerk user ids look like "user_2abc...", hence text, not uuid). RLS is enabled with NO policies, so the public anon key
-- can neither read nor write anything.

create extension if not exists pgcrypto;

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  type        text not null check (type in ('resume','skill_gap','roadmap','interview','answer_feedback')),
  title       text not null,
  input       jsonb not null,
  output      jsonb not null,
  engine      text not null check (engine in ('openai','mock')),
  model       text,
  created_at  timestamptz not null default now()
);
create index if not exists reports_user_created_idx on public.reports (user_id, created_at desc);
create index if not exists reports_user_type_created_idx on public.reports (user_id, type, created_at desc);

create table if not exists public.profiles (
  user_id          text primary key,
  target_role      text not null default '',
  experience_level text not null default 'mid' check (experience_level in ('entry','mid','senior')),
  skills           text[] not null default '{}',
  updated_at       timestamptz not null default now()
);

-- Append-only log of AI generations, used for per-user daily quotas (deleting a report must not refund quota).
create table if not exists public.usage_events (
  id          bigint generated always as identity primary key,
  user_id     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists usage_events_user_created_idx on public.usage_events (user_id, created_at desc);

alter table public.reports  enable row level security;
alter table public.usage_events enable row level security;
alter table public.profiles enable row level security;
-- (intentionally no policies)
