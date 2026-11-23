import Link from "next/link";
import { requireUser, profileGaps } from "@/lib/auth";
import { PageHeader, StatusPill, timeAgo } from "@/components/ui";
import { STATUSES, type Application } from "@/lib/types";

export default async function Dashboard() {
  const { supabase, profile } = await requireUser();
  const { data: apps } = await supabase
    .from("applications")
    .select("id, company, role, status, updated_at")
    .order("updated_at", { ascending: false })
    .returns<Pick<Application, "id" | "company" | "role" | "status" | "updated_at">[]>();
  const { count: interviews } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("kind", "interview");

  const gaps = profileGaps(profile);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, (apps ?? []).filter((a) => a.status === s).length]));
  const first = profile.full_name?.split(" ")[0];

  const journey = [
    { n: "0", t: "Add your details", d: "Resume, target role, real results. Done once, used everywhere.", href: "/profile" },
    { n: "1–3", t: "Decode, score, tailor", d: "For every job: understand the JD, check fit, rewrite your resume honestly.", href: "/applications/new" },
    { n: "4", t: "Fix LinkedIn", d: "Headlines, About and skills recruiters search for.", href: "/linkedin" },
    { n: "5", t: "Reach the hiring person", d: "A value-led note and message that's about their problem.", href: "/applications" },
    { n: "6", t: "Practise the interview", d: "Voice mock interview, 6 questions, honest score.", href: "/interview" },
    { n: "7", t: "Negotiate the offer", d: "Check the offer vs market, then role-play HR.", href: "/negotiation" },
  ];

  return (
    <>
      <PageHeader eyebrow="Dashboard" title={first ? `Hi ${first}, let's get you hired.` : "Let's get you hired."}>
        Everything you do here is saved — come back any time and pick up where you left off.
      </PageHeader>

      {gaps.length > 0 && (
        <Link href="/profile" className="mb-8 block rounded-xl border border-warm/30 bg-warm-soft px-5 py-4 text-sm hover:border-warm/60">
          <span className="font-medium text-warm">Finish your details first →</span>{" "}
          <span className="text-ink/80">Add {gaps.join(", ")}. Every prompt uses them — the output is only as good as what you put in.</span>
        </Link>
      )}

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Applications", (apps ?? []).length],
          ["Applied", counts.applied + counts.interviewing + counts.offer + counts.rejected],
          ["Interviewing", counts.interviewing],
          ["Mock interviews", interviews ?? 0],
        ].map(([label, n]) => (
          <div key={label as string} className="card px-4 py-4">
            <div className="text-2xl font-semibold">{n}</div>
            <div className="text-xs text-muted">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Recent applications</h2>
            <Link href="/applications/new" className="btn btn-primary py-1.5 text-sm">+ New job</Link>
          </div>
          {(apps ?? []).length === 0 ? (
            <div className="card p-6 text-sm text-muted">
              No jobs yet. Found a job you like? <Link href="/applications/new" className="text-accent underline">Add it</Link> and paste the JD.
            </div>
          ) : (
            <div className="card divide-y divide-line">
              {(apps ?? []).slice(0, 6).map((a) => (
                <Link key={a.id} href={`/applications/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#fbfaf7]">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.role}</div>
                    <div className="truncate text-xs text-muted">{a.company} · {timeAgo(a.updated_at)}</div>
                  </div>
                  <StatusPill status={a.status} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-2">
          <h2 className="mb-3 font-medium">The system</h2>
          <ol className="space-y-2">
            {journey.map((j) => (
              <li key={j.n}>
                <Link href={j.href} className="flex gap-3 rounded-lg p-2 hover:bg-[#f3f0ea]">
                  <span className="mt-0.5 w-9 shrink-0 text-xs font-semibold text-accent">{j.n}</span>
                  <span>
                    <span className="block text-sm font-medium">{j.t}</span>
                    <span className="block text-xs text-muted">{j.d}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
