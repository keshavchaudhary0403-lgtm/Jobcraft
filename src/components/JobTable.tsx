import Link from "next/link";
import type { Application } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { CompanyAvatar, MatchChip, StatusPill, timeAgo } from "./ui";

const questionCount = (an: Analysis) => new Set([...(an.questions ?? []), ...(an.gaps ?? []).map((g) => g.question).filter(Boolean)]).size;

/** The single most useful next step for a job. */
export function nextStep(a: Application, practised: Set<string>) {
  const an = a.analysis as Analysis | null;
  if (!an) return "See your match";
  const unanswered = questionCount(an) - Object.values(a.fit_answers ?? {}).filter((v) => v?.trim()).length;
  if (unanswered > 0) return `Answer ${unanswered} question${unanswered > 1 ? "s" : ""}`;
  if (!a.tailored_resume) return "Tailor resume";
  if (!a.outreach) return "Write outreach";
  if (a.status === "saved") return "Apply";
  if (["applied", "interviewing"].includes(a.status) && !practised.has(a.id)) return "Practise interview";
  return "On track";
}

/** Scannable jobs list: role, match, status, next step, last update. */
export function JobTable({ apps, practised }: { apps: Application[]; practised: Set<string> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px]">
        <thead>
          <tr className="border-b border-line text-left text-[0.78rem] text-muted">
            <th className="px-5 py-2.5 font-medium">Role</th>
            <th className="px-3 py-2.5 font-medium">Location</th>
            <th className="px-3 py-2.5 font-medium">Match</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Next step</th>
            <th className="px-5 py-2.5 text-right font-medium">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {apps.map((a) => {
            const an = a.analysis as Analysis | null;
            return (
              <tr key={a.id} className="group transition hover:bg-brand-soft/30">
                <td className="px-5 py-3">
                  <Link href={`/jobs/${a.id}`} className="flex items-center gap-3">
                    <CompanyAvatar name={a.company} size={34} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium group-hover:text-brand-ink">{a.role}</span>
                      <span className="block truncate text-[0.82rem] text-muted">{a.company}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-3 text-[0.88rem] text-muted">{a.location ?? "—"}</td>
                <td className="px-3 py-3">{an ? <MatchChip score={an.fit_score} /> : <span className="text-[0.84rem] text-faint">Not analysed</span>}</td>
                <td className="px-3 py-3"><StatusPill status={a.status} /></td>
                <td className="px-3 py-3"><Link href={`/jobs/${a.id}`} className="text-[0.88rem] font-medium text-brand-ink hover:underline">{nextStep(a, practised)}</Link></td>
                <td className="px-5 py-3 text-right text-[0.82rem] text-muted">{timeAgo(a.updated_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
