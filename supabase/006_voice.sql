-- 006: realistic AI voice (per-user switch + voice choice) and demo auto-reset
alter table public.profiles add column if not exists voice_enabled boolean not null default false;
alter table public.app_settings add column if not exists voice_name text not null default 'marin';
alter table public.app_settings add column if not exists demo_reset_at timestamptz;

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
    new.voice_enabled     := old.voice_enabled;
  end if;
  new.updated_at := now();
  return new;
end $$;
