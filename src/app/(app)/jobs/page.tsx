import Link from "next/link";
import { Columns3, LayoutGrid, Plus } from "lucide-react";
import { JobBoard } from "@/components/JobBoard";
import { JobTile, STATUS_BAR, StatusDonut } from "@/components/JobTiles";
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
          <p className="mt-2 text-[1rem] text-muted">{jobs.length ? `${jobs.length} job${jobs.length === 1 ? "" : "s"} — every one tracked from decode to offer.` : "Every job you're going after, in one place."}</p>
        </div>
        {jobs.length > 0 && (
          <div className="inline-flex gap-1 rounded-full border-[1.5px] border-line p-1">
            <Link href="/jobs" className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-[0.9rem] font-semibold transition ${!board ? "bg-side text-cream" : "text-muted hover:text-ink"}`}><LayoutGrid size={15} /> Journeys</Link>
            <Link href="/jobs?view=board" className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-[0.9rem] font-semibold transition ${board ? "bg-side text-cream" : "text-muted hover:text-ink"}`}><Columns3 size={15} /> Board</Link>
          </div>
        )}
      </header>

      {!jobs.length ? (
        <Link href="/jobs/new" className="flex items-center gap-5 rounded-[22px] border-[1.5px] border-dashed border-clay/50 bg-card p-8 transition hover:border-clay fade-up">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-clay text-white"><Plus size={24} /></span>
          <span className="flex-1">
            <span className="block font-display text-[1.35rem] font-bold">Add the first job you want</span>
            <span className="block text-muted">Paste the description — get your match, a tailored resume and a note for the hiring manager.</span>
          </span>
        </Link>
      ) : board ? (
        <JobBoard apps={jobs} />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
          {/* Overview: status donut doubles as the filter */}
          <aside className="card p-5 lg:sticky lg:top-6 fade-up">
            <div className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-muted">Where they stand</div>
            <StatusDonut counts={counts} total={jobs.length} />
            <ul className="mt-4 space-y-1">
              <li>
                <Link href={q({ status: undefined })} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.92rem] transition ${!status ? "bg-side text-cream" : "hover:bg-line-2"}`}>
                  <span className="flex-1 font-semibold">All jobs</span><span className="tabular-nums opacity-70">{jobs.length}</span>
                </Link>
              </li>
              {STATUSES.filter((s) => counts[s]).map((s) => (
                <li key={s}>
                  <Link href={q({ status: s })} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.92rem] transition ${status === s ? "bg-side text-cream" : "hover:bg-line-2"}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${STATUS_BAR[s]}`} />
                    <span className="flex-1 font-medium">{STATUS_META[s].label}</span><span className="tabular-nums opacity-70">{counts[s]}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-line pt-4">
              <div className="mb-2 text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-muted">Sort by</div>
              <div className="grid grid-cols-2 gap-1 rounded-full border-[1.5px] border-line p-1">
                <Link href={q({ sort: undefined })} className={`rounded-full py-1.5 text-center text-[0.86rem] font-semibold ${sort === "recent" ? "bg-side text-cream" : "text-muted hover:text-ink"}`}>Recent</Link>
                <Link href={q({ sort: "fit" })} className={`rounded-full py-1.5 text-center text-[0.86rem] font-semibold ${sort === "fit" ? "bg-side text-cream" : "text-muted hover:text-ink"}`}>Best fit</Link>
              </div>
            </div>
          </aside>

          {/* Job tiles */}
          <section className="grid gap-5 md:grid-cols-2 stagger">
            {shown.map((a) => <JobTile key={a.id} a={a} practised={practised} />)}
            {!status && shown.length > 0 && (
              <Link href="/jobs/new" className={`flex min-h-[170px] items-center justify-center gap-4 rounded-[22px] border-[1.5px] border-dashed border-line text-muted transition hover:border-clay hover:text-clay ${shown.length % 2 === 0 ? "md:col-span-2" : "flex-col"}`}>
                <span className="grid h-12 w-12 place-items-center rounded-full bg-line-2"><Plus size={20} /></span>
                <span className={shown.length % 2 === 0 ? "" : "text-center"}>
                  <span className="block font-display text-[1.15rem] font-bold text-ink">Add another job</span>
                  <span className="block text-[0.86rem]">Paste a link or a description — we decode it in seconds.</span>
                </span>
              </Link>
            )}
            {!shown.length && <div className="card p-10 text-center text-muted md:col-span-2">No jobs in this stage.</div>}
          </section>
        </div>
      )}
    </div>
  );
}

