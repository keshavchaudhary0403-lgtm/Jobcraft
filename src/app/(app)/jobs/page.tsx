import Link from "next/link";
import { BriefcaseBusiness, Columns3, List, Plus } from "lucide-react";
import { JobTable } from "@/components/JobTable";
import { JobBoard } from "@/components/JobBoard";
import { requireUser } from "@/lib/auth";
import { Empty, PageHeader, STATUS_META } from "@/components/ui";
import { STATUSES, type Application, type Status } from "@/lib/types";

export const metadata = { title: "Jobs" };

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ status?: string; view?: string }> }) {
  const { status, view } = await searchParams;
  const board = view === "board";
  const { supabase } = await requireUser();
  const [{ data: all }, { data: sess }] = await Promise.all([
    supabase.from("applications").select("*").order("updated_at", { ascending: false }).returns<Application[]>(),
    supabase.from("sessions").select("application_id").eq("kind", "interview"),
  ]);
  const practised = new Set((sess ?? []).map((x) => x.application_id).filter(Boolean) as string[]);
  const apps = (all ?? []).filter((a) => !status || a.status === status);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, (all ?? []).filter((a) => a.status === s).length])) as Record<Status, number>;
  const tab = (active: boolean) => `flex h-8 items-center gap-1.5 rounded-lg px-3 text-[0.9rem] font-semibold transition ${active ? "bg-white text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink"}`;

  return (
    <>
      <PageHeader title="Jobs" sub={all?.length ? `${all.length} in your pipeline` : "Every job you're going after, in one place."} action={<Link href="/jobs/new" className="btn btn-primary"><Plus size={16} /> Add job</Link>} />
      {!!all?.length && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 fade-up">
        {board ? <p className="text-[0.9rem] text-muted">Drag a job to move it to the next stage.</p> : (
        <div className="inline-flex flex-wrap gap-1 rounded-xl bg-line-2 p-1">
          <Link href="/jobs" className={tab(!status)}>All <span className="text-faint">{all.length}</span></Link>
          {STATUSES.filter((s) => counts[s]).map((s) => (
            <Link key={s} href={`/jobs?status=${s}`} className={tab(status === s)}>
              {STATUS_META[s].label} <span className="text-faint">{counts[s]}</span>
            </Link>
          ))}
        </div>
        )}
        <div className="inline-flex gap-1 rounded-xl bg-line-2 p-1">
          <Link href="/jobs" className={tab(!board)}><List size={14} /> List</Link>
          <Link href="/jobs?view=board" className={tab(board)}><Columns3 size={14} /> Board</Link>
        </div>
        </div>
      )}
      {!apps.length ? (
        <Empty icon={<BriefcaseBusiness size={20} />} title="No jobs yet" sub="Paste a job description to get your match, a tailored resume and outreach." action={<Link href="/jobs/new" className="btn btn-brand"><Plus size={16} /> Add your first job</Link>} />
      ) : board ? (
        <JobBoard apps={all ?? []} />
      ) : (
        <div className="card overflow-hidden fade-up"><JobTable apps={apps} practised={practised} /></div>
      )}
    </>
  );
}
