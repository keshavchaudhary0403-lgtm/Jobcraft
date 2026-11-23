-- Jobcraft migration 004: structured results (analysis, resume, outreach, LinkedIn) + onboarding. Safe to re-run.
alter table public.profiles add column if not exists current_title text;
alter table public.profiles add column if not exists skills text[];
alter table public.profiles add column if not exists linkedin_result jsonb;
alter table public.profiles add column if not exists onboarded boolean not null default false;

alter table public.applications alter column company set default 'New job';
alter table public.applications alter column role set default 'Analysing…';
alter table public.applications add column if not exists location text;
alter table public.applications add column if not exists seniority text;
alter table public.applications add column if not exists analysis jsonb;
alter table public.applications add column if not exists fit_answers jsonb not null default '{}'::jsonb;
alter table public.applications add column if not exists resume_result jsonb;
alter table public.applications add column if not exists outreach jsonb;
