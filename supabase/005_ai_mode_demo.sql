-- 005: per-user AI mode (real / demo / off) + shared demo login
alter table public.profiles add column if not exists ai_mode text not null default 'real';
alter table public.profiles drop constraint if exists profiles_ai_mode_check;
alter table public.profiles add constraint profiles_ai_mode_check check (ai_mode in ('real', 'demo', 'off'));
alter table public.profiles add column if not exists is_demo boolean not null default false;
alter table public.app_settings add column if not exists demo_enabled boolean not null default false;

-- Users can't change their own admin/limit/AI settings.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    new.is_admin          := old.is_admin;
    new.is_active         := old.is_active;
    new.phone             := old.phone;
    new.email             := old.email;
    new.monthly_limit_inr := old.monthly_limit_inr;
    new.ai_mode           := old.ai_mode;
    new.is_demo           := old.is_demo;
  end if;
  new.updated_at := now();
  return new;
end $$;
