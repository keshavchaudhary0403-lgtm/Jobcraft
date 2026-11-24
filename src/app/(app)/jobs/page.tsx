import Link from "next/link";
import { ArrowRight, Columns3, LayoutGrid, Plus } from "lucide-react";
import { JobBoard } from "@/components/JobBoard";
import { JobTile, STATUS_BAR, StatusBar } from "@/components/JobTiles";
import { requireUser } from "@/lib/auth";
import { STATUS_META } from "@/components/ui";
import { STATUSES, type Application, type Status } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";

export const metadata = { title: "Jobs" };


export default async function JobsPage({ searchParams }: { searchParams: Promise<{ status?: string; view?: string; sort?: string }> }) {
  const { status, view, sort = "recent" } = await searchParams;
  const board = view === "board";
  const { supabase } = await requireUser();
  const [{ data: all }, { data: sessions }] = await Promise.all([
    supabase.from("applications").select("*").order("updated_at", { ascending: false }).returns<Application[]>(),
    supabase.from("sessions").select("application_id").eq("kind", "interview"),
  ]);
  const jobs = all ?? [];
  const practised = new Set((sessions ?? []).map((s) => s.application_id).filter(Boolean) as string[]);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, jobs.filter((a) => a.status === s).length])) as Record<Status, number>;
  const fit = (a: Application) => (a.analysis as Analysis | null)?.fit_score ?? -1;
  const shown = jobs
    .filter((a) => !status || a.status === status)
    .sort((x, y) => (sort === "fit" ? fit(y) - fit(x) : 0));
  const q = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged = { status, sort: sort === "recent" ? undefined : sort, ...p };
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    const s = u.toString();
    return `/jobs${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 pt-2 fade-up">
        <div>
          <h1 className="text-[2.6rem] font-bold leading-none">Jobs<span className="text-clay">.</span></h1>
          <p className="mt-2 text-[1rem] text-muted">Every job, from decode to offer.</p>
        </div>
        {jobs.length > 0 && (
          <div className="inline-flex gap-1 rounded-full border-[1.5px] border-line p-1">
            <Link href="/jobs" className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-[0.9rem] font-semibold transition ${!board ? "bg-side text-cream" : "text-muted hover:text-ink"}`}><LayoutGrid size={15} /> Journeys</Link>
            <Link href="/jobs?view=board" className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-[0.9rem] font-semibold transition ${board ? "bg-side text-cream" : "text-muted hover:text-ink"}`}><Columns3 size={15} /> Board</Link>
          </div>
        )}
      </header>

      {!jobs.length ? (
        <Link href="/jobs/new" className="group card card-hover flex items-center gap-5 p-6 fade-up">
          <span data-tone="1" className="tone-chip grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-line-2"><Plus size={24} /></span>
          <span className="flex-1">
            <span className="block font-display text-[1.35rem] font-bold">Add the first job you want</span>
            <span className="block text-muted">Paste the description. We do the rest.</span>
          </span>
          <span className="pill-action hidden sm:inline-flex">Add a job <ArrowRight size={15} /></span>
        </Link>
      ) : board ? (
        <JobBoard apps={jobs} />
      ) : (
        <>
          {/* Summary row: count + status bar, filter chips, sort. Light, like LinkedIn / Interview / Salary. */}
          <section className="card flex flex-wrap items-center gap-x-5 gap-y-3 p-4 fade-up sm:p-5">
            <div className="flex min-w-[150px] flex-col gap-1.5">
              <div className="flex items-baseline gap-1.5"><span className="font-display text-[1.5rem] font-bold leading-none tabular-nums">{jobs.length}</span><span className="text-[0.86rem] text-muted">job{jobs.length === 1 ? "" : "s"}</span></div>
              <StatusBar counts={counts} total={jobs.length} height={6} />
            </div>
            <div className="ml-auto inline-flex shrink-0 gap-1 rounded-full border-[1.5px] border-line p-1 sm:order-last">
              <Link href={q({ sort: undefined })} className={`rounded-full px-3.5 py-1.5 text-[0.84rem] font-semibold ${sort === "recent" ? "bg-side text-white" : "text-muted hover:text-ink"}`}>Recent</Link>
              <Link href={q({ sort: "fit" })} className={`rounded-full px-3.5 py-1.5 text-[0.84rem] font-semibold ${sort === "fit" ? "bg-side text-white" : "text-muted hover:text-ink"}`}>Best fit</Link>
            </div>
            <div className="no-scrollbar -mx-1 flex w-full min-w-0 gap-2 overflow-x-auto px-1 py-0.5 sm:w-auto sm:flex-1">
              <Link href={q({ status: undefined })} className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.86rem] font-semibold transition ${!status ? "bg-side text-white" : "bg-line-2 text-ink hover:bg-line"}`}>
                All <span className="tabular-nums opacity-70">{jobs.length}</span>
              </Link>
              {STATUSES.filter((s) => counts[s]).map((s) => (
                <Link key={s} href={q({ status: s })} className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.86rem] font-semibold transition ${status === s ? "bg-side text-white" : "bg-line-2 text-ink hover:bg-line"}`}>
                  <span className={`h-2 w-2 rounded-full ${STATUS_BAR[s]}`} />
                  {STATUS_META[s].label} <span className="tabular-nums opacity-70">{counts[s]}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Job tiles: full width, grows row by row */}
          <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3 stagger">
            {shown.map((a) => <JobTile key={a.id} a={a} practised={practised} />)}
            {!status && (
              <Link href="/jobs/new" className="group card card-hover flex min-h-[200px] flex-col p-6">
                <span data-tone="1" className="tone-chip grid h-11 w-11 place-items-center rounded-xl bg-line-2"><Plus size={20} /></span>
                <span className="mt-4 block font-display text-[1.15rem] font-bold">Add another job</span>
                <span className="block text-[0.86rem] text-muted">Paste a link or the description.</span>
                <span className="mt-auto pt-4"><span className="pill-action">Add a job <ArrowRight size={14} /></span></span>
              </Link>
            )}
            {!shown.length && <div className="card p-10 text-center text-muted md:col-span-2 2xl:col-span-3">No jobs in this stage.</div>}
          </section>
        </>
      )}
    </div>
  );
}

