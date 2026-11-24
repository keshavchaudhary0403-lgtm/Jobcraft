import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { Application } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { CompanyAvatar, STATUS_META, timeAgo } from "./ui";

export function JobCard({ a }: { a: Application }) {
  const an = a.analysis as Analysis | null;
  const m = an ? an.fit_score * 10 : null;
  const st = STATUS_META[a.status];
  const steps = [!!an, !!a.tailored_resume, !!a.outreach, ["applied", "interviewing", "offer"].includes(a.status)];
  return (
    <Link href={`/jobs/${a.id}`} className="card card-hover group flex flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <CompanyAvatar name={a.company} jobUrl={a.job_url} size={46} />
        <span className={`chip ${st.cls}`}>{st.label}</span>
      </div>
      <div className="mt-5 line-clamp-2 font-display text-[1.3rem] font-bold leading-[1.15]">{a.role}</div>
      <div className="mt-1 truncate text-muted">{a.company}</div>
      <div className="mt-1 flex items-center gap-3 text-[0.82rem] text-faint">
        {a.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{a.location}</span>}
        <span>{timeAgo(a.updated_at)}</span>
      </div>
      <div className="mt-auto flex items-end justify-between gap-3 pt-6">
        <div>
          <div className="flex items-baseline gap-1">
            <span className={`font-display text-[2.4rem] font-bold leading-none tabular-nums ${m == null ? "text-faint" : m >= 70 ? "text-good" : m >= 50 ? "text-mid" : "text-bad"}`}>{m ?? "-"}</span>
            {m != null && <span className="text-[0.82rem] text-muted">% fit</span>}
          </div>
          <div className="mt-2 flex w-32 gap-1">{steps.map((d, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${d ? "bg-brand" : "bg-line"}`} />)}</div>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-side text-cream transition group-hover:bg-brand"><ArrowUpRight size={18} /></span>
      </div>
    </Link>
  );
}
