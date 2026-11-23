import Link from "next/link";
import { BriefcaseBusiness, MapPin, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { CompanyAvatar, Empty, PageHeader, ScoreRing, StatusPill, STATUS_META, timeAgo } from "@/components/ui";
import { STATUSES, type Application, type Status } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";

export const metadata = { title: "Jobs" };

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { supabase } = await requireUser();
  const { data: all } = await supabase.from("applications").select("*").order("updated_at", { ascending: false }).returns<Application[]>();
  const apps = (all ?? []).filter((a) => !status || a.status === status);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, (all ?? []).filter((a) => a.status === s).length])) as Record<Status, number>;

  return (
    <>
      <PageHeader
        title="Jobs"
        sub={all?.length ? `${all.length} in your pipeline` : undefined}
        action={<Link href="/jobs/new" className="btn btn-primary"><Plus size={16} /> Add job</Link>}
      />
      {!!all?.length && (
        <div className="mb-6 flex flex-wrap gap-2 fade-up">
          <Link href="/jobs" className={`chip border px-3 py-1.5 text-sm ${!status ? "border-ink bg-ink text-white" : "border-line bg-white text-slate-600 hover:border-slate-300"}`}>
            All <span className="opacity-60">{all.length}</span>
          </Link>
          {STATUSES.filter((s) => counts[s]).map((s) => (
            <Link key={s} href={`/jobs?status=${s}`} className={`chip border px-3 py-1.5 text-sm ${status === s ? "border-ink bg-ink text-white" : "border-line bg-white text-slate-600 hover:border-slate-300"}`}>
              {STATUS_META[s].label} <span className="opacity-60">{counts[s]}</span>
            </Link>
          ))}
        </div>
      )}
      {!apps.length ? (
        <Empty
          icon={<BriefcaseBusiness size={22} />}
          title="No jobs yet"
          sub="Paste a job description and get a match score, a tailored resume and outreach in minutes."
          action={<Link href="/jobs/new" className="btn btn-brand"><Plus size={16} /> Add your first job</Link>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 stagger">
          {apps.map((a) => {
            const an = a.analysis as Analysis | null;
            return (
              <Link key={a.id} href={`/jobs/${a.id}`} className="card card-hover flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <CompanyAvatar name={a.company} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{a.role}</div>
                    <div className="truncate text-sm text-muted">{a.company}</div>
                  </div>
                  {an ? <ScoreRing score={an.fit_score} size={44} stroke={5} /> : <span className="chip bg-slate-100 text-slate-500">New</span>}
                </div>
                {an?.summary && <p className="mt-4 line-clamp-2 text-sm text-slate-600">{an.summary}</p>}
                <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted">
                  <span className="flex items-center gap-1 truncate">{a.location && <><MapPin size={12} /> {a.location}</>}</span>
                  <span className="flex items-center gap-2"><StatusPill status={a.status} /> {timeAgo(a.updated_at)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
