-- 011: remember each job's company website (for the official wordmark) and the logo saved from the job page.
alter table public.applications add column if not exists company_domain text;
alter table public.applications add column if not exists company_logo text;
