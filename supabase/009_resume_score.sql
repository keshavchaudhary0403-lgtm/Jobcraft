-- 009: remember the first resume-health score, to show progress ("62 → 78")
alter table public.profiles add column if not exists resume_score_start int;
