-- Jobcraft migration 003: live USD → INR rate. Safe to re-run.
alter table public.app_settings add column if not exists fx_auto boolean not null default true;
alter table public.app_settings add column if not exists fx_updated_at timestamptz;
alter table public.app_settings add column if not exists fx_source text;
