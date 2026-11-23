-- Jobcraft migration 002: AI usage tracking + spend limits.
-- Run once in Supabase SQL Editor (already included in schema.sql for new installs). Safe to re-run.

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
