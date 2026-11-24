-- 010: per-person AI model and voice engine (null = use the app default set in Admin)
alter table public.profiles add column if not exists ai_model text;
alter table public.profiles add column if not exists voice_engine text;
-- App-wide voice engine: 'realtime' = OpenAI live voice, 'model' = the chosen AI model talks (e.g. Claude)
alter table public.app_settings add column if not exists voice_engine text not null default 'realtime';
