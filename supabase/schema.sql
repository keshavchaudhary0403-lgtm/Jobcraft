-- Jobcraft database schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE where possible).

-- ─────────────────────────────────────────────────────────────
-- PROFILES: one row per user. Holds the details every prompt needs.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text unique,               -- digits only, e.g. 919876543210
  is_admin boolean not null default false,
  is_active boolean not null default true,

  -- Career details (used to fill prompts)
  target_role text,                -- e.g. "Digital Marketing Manager in e-commerce or D2C"
  experience_years text,
  city text,
  current_ctc text,
  master_resume text,              -- full resume as plain text
  strongest_proof text,            -- 1–2 best real results with numbers
  linkedin_url text,
  extra_notes text,                -- anything else true about you

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- APPLICATIONS: one row per job you are going after.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  role text not null,
  job_url text,
  jd text not null,                -- full job description
  company_type text,               -- startup / MNC / agency ...
  hiring_contact text,             -- name / LinkedIn of recruiter or hiring manager
  status text not null default 'saved'
    check (status in ('saved','applied','interviewing','offer','rejected','withdrawn')),
  applied_on date,
  notes text,
  tailored_resume text,            -- the final resume version you used for this job
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists applications_user_idx on public.applications(user_id, updated_at desc);

-- ─────────────────────────────────────────────────────────────
-- SESSIONS: an AI conversation (like "one ChatGPT chat").
-- kind: workspace (prompts 1–5 for a job), linkedin, interview, negotiation
-- ─────────────────────────────────────────────────────────────
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  kind text not null check (kind in ('workspace','linkedin','interview','negotiation')),
  title text,
  meta jsonb not null default '{}'::jsonb,   -- e.g. negotiation inputs
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on public.sessions(user_id, kind, updated_at desc);

-- ─────────────────────────────────────────────────────────────
-- MESSAGES: every turn in a session.
-- step: which library prompt produced this turn (jd_decoder, fit_score, ...)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  step text,
  created_at timestamptz not null default now()
);
create index if not exists messages_session_idx on public.messages(session_id, created_at);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security: every user sees only their own rows.
-- ─────────────────────────────────────────────────────────────
alter table public.profiles     enable row level security;
alter table public.applications enable row level security;
alter table public.sessions     enable row level security;
alter table public.messages     enable row level security;

drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

drop policy if exists "own applications" on public.applications;
create policy "own applications" on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own messages" on public.messages;
create policy "own messages" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Explicit API grants (needed when "auto-grant new tables" is off). anon gets nothing.
revoke all on public.profiles, public.applications, public.sessions, public.messages from anon;
grant usage on schema public to authenticated, service_role;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.applications, public.sessions, public.messages to authenticated;
grant all on public.profiles, public.applications, public.sessions, public.messages to service_role;

-- Users must not be able to make themselves admin or change their login phone.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    new.is_admin  := old.is_admin;
    new.is_active := old.is_active;
    new.phone     := old.phone;
    new.email     := old.email;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ─────────────────────────────────────────────────────────────
-- Auto-create a profile whenever a user is added to auth.users
-- (whether from the Supabase dashboard or the in-app Admin page).
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, phone, full_name)
  values (
    new.id,
    case when new.email like '%@phone.jobcraft.invalid' then null else new.email end,
    nullif(regexp_replace(coalesce(
      new.phone,
      new.raw_user_meta_data->>'phone',
      case when new.email like '%@phone.jobcraft.invalid' then split_part(new.email, '@', 1) end,
      ''), '\D', '', 'g'), ''),
    new.raw_user_meta_data->>'full_name'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users that existed before this script ran.
insert into public.profiles (id, email, phone)
select u.id,
       case when u.email like '%@phone.jobcraft.invalid' then null else u.email end,
       nullif(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), '')
from auth.users u
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- AI usage tracking + spend limits (same as 002_usage_limits.sql)
-- ─────────────────────────────────────────────────────────────

-- One-row settings table, only readable/writable by the server (service role).
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  ai_model text not null default 'gpt-6.1-terra',
  default_monthly_limit_inr numeric,          -- per user per month; null = no limit
  total_monthly_limit_inr numeric,            -- all users together per month; null = no limit
  usd_to_inr numeric not null default 88,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id, default_monthly_limit_inr, total_monthly_limit_inr)
values (1, 100, 1000) on conflict (id) do nothing;
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
grant all on public.app_settings to service_role;

-- Per-user override. null = use the default limit.
alter table public.profiles add column if not exists monthly_limit_inr numeric;

-- Every AI call is logged with its tokens and cost.
create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  feature text not null,            -- chat / resume_import
  model text not null,
  input_tokens int not null default 0,
  cached_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists usage_events_user_month on public.usage_events(user_id, created_at);
create index if not exists usage_events_month on public.usage_events(created_at);
alter table public.usage_events enable row level security;
drop policy if exists "own usage read" on public.usage_events;
create policy "own usage read" on public.usage_events for select using (auth.uid() = user_id);
revoke all on public.usage_events from anon;
grant select on public.usage_events to authenticated;
grant all on public.usage_events to service_role;

-- Users can't raise their own limit.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    new.is_admin          := old.is_admin;
    new.is_active         := old.is_active;
    new.phone             := old.phone;
    new.email             := old.email;
    new.monthly_limit_inr := old.monthly_limit_inr;
  end if;
  new.updated_at := now();
  return new;
end $$;
