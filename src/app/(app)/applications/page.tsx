import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Empty, PageHeader, StatusPill, timeAgo } from "@/components/ui";
import { STATUSES, type Application } from "@/lib/types";

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { supabase } = await requireUser();
  let q = supabase.from("applications").select("*").order("updated_at", { ascending: false });
  if (status && (STATUSES as readonly string[]).includes(status)) q = q.eq("status", status);
  const { data: apps } = await q.returns<Application[]>();

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader eyebrow="Prompts 1–5" title="Job applications">
          One workspace per job: decode the JD, check your fit, tailor your resume, then write outreach.
        </PageHeader>
        <Link href="/applications/new" className="btn btn-primary">+ New job</Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/applications" className={`rounded-full px-3 py-1 ${!status ? "bg-ink text-white" : "bg-white border border-line"}`}>All</Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/applications?status=${s}`} className={`rounded-full px-3 py-1 capitalize ${status === s ? "bg-ink text-white" : "bg-white border border-line"}`}>
            {s}
          </Link>
        ))}
      </div>

      {!apps?.length ? (
        <Empty title="No jobs here yet">Add a job you want — paste its full job description and the workspace sets itself up.</Empty>
      ) : (
        <div className="card divide-y divide-line">
          {apps.map((a) => (
            <Link key={a.id} href={`/applications/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-[#fbfaf7]">
              <div className="min-w-0">
                <div className="truncate font-medium">{a.role}</div>
                <div className="truncate text-sm text-muted">
                  {a.company}
                  {a.company_type ? ` · ${a.company_type}` : ""} · updated {timeAgo(a.updated_at)}
                  {a.tailored_resume ? " · tailored resume ✓" : ""}
                </div>
              </div>
              <StatusPill status={a.status} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
