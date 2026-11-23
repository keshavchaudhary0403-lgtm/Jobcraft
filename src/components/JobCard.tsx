import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { Application } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { CompanyAvatar, MatchChip, StatusPill, timeAgo } from "./ui";

export function JobCard({ a }: { a: Application }) {
  const an = a.analysis as Analysis | null;
  return (
    <Link href={`/jobs/${a.id}`} className="card card-hover group flex flex-col p-4">
      <div className="flex items-center gap-2.5">
        <CompanyAvatar name={a.company} size={34} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.92rem] font-medium">{a.company}</div>
          <div className="text-[0.78rem] text-faint">{timeAgo(a.updated_at)}</div>
        </div>
        <StatusPill status={a.status} />
      </div>
      <div className="mt-3 line-clamp-2 text-[1.02rem] font-semibold leading-snug">{a.role}</div>
      {a.location && (
        <div className="mt-1 flex items-center gap-1 text-[0.85rem] text-muted"><MapPin size={13} /> {a.location}</div>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {an ? <MatchChip score={an.fit_score} /> : <span className="chip bg-slate-100 text-slate-500">Not analysed</span>}
        {an?.seniority && <span className="chip bg-slate-100 text-slate-600">{an.seniority}</span>}
        {a.tailored_resume && <span className="chip bg-brand-soft text-brand-ink">Resume ready</span>}
      </div>
      <div className="mt-auto flex items-center justify-end pt-4">
        <span className="btn btn-primary btn-sm opacity-90 transition group-hover:opacity-100">Open <ArrowUpRight size={14} /></span>
      </div>
    </Link>
  );
}
