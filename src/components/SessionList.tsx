import Link from "next/link";
import { ChevronRight, History } from "lucide-react";
import type { Session } from "@/lib/types";
import { timeAgo } from "./ui";

export function SessionList({ sessions, base }: { sessions: Session[]; base: string }) {
  if (!sessions.length) return null;
  return (
    <div className="card overflow-hidden p-5 pb-0 fade-up">
      <div className="card-head !mb-0"><span className="ico"><History size={15} /></span>Recent sessions</div>
      <div className="-mx-5 divide-y divide-line">
        {sessions.map((s) => (
          <Link key={s.id} href={`${base}/${s.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-line-2/60">
            <span className="truncate font-medium">{s.title}</span>
            <span className="flex shrink-0 items-center gap-2 text-[0.82rem] text-muted">{timeAgo(s.updated_at)} <ChevronRight size={14} /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
