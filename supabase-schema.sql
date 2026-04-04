-- ─────────────────────────────────────────────────────────────────────────────
-- The Commit — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension (usually already enabled on Supabase)
create extension if not exists "uuid-ossp";

-- ─── ARTICLES TABLE ───────────────────────────────────────────────────────────
create table if not exists public.articles (
  id                 uuid primary key default uuid_generate_v4(),
  topic              text not null,
  headline           text not null,
  subheadline        text,
  body               text not null,
  category           text check (category in ('Tools', 'Funding', 'Open Source', 'AI', 'Community', 'SaaS')) default 'AI',
  read_time_minutes  integer default 3,
  digest_bullets     text[] default '{}',
  sources            jsonb default '[]',
  virlo_rank         integer,
  fetched_at         timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists articles_fetched_at_idx on public.articles (fetched_at desc);
create index if not exists articles_category_idx   on public.articles (category);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- Articles are readable by any authenticated user
alter table public.articles enable row level security;

create policy "Authenticated users can read articles"
  on public.articles for select
  to authenticated
  using (true);

-- Only service role (backend) can insert/update/delete
create policy "Service role can manage articles"
  on public.articles for all
  to service_role
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- AUTH is handled automatically by Supabase (no tables needed)
-- Users are stored in auth.users — we use supabase.auth.signUp / signInWithPassword
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── OPTIONAL: Disable email confirmation for dev (Supabase Dashboard) ────────
-- Go to: Authentication → Settings → Email Auth
-- Toggle OFF: "Enable email confirmations"
-- This lets users log in immediately after signup without confirming email
-- Re-enable before going to production if you want email verification
