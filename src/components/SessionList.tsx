import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Session } from "@/lib/types";
import { timeAgo } from "./ui";

export function SessionList({ sessions, base }: { sessions: Session[]; base: string }) {
  if (!sessions.length) return null;
  return (
    <div className="fade-up">
      <div className="mb-3 text-xs font-medium uppercase tracking-wider text-faint">Recent</div>
      <div className="card divide-y divide-line overflow-hidden">
        {sessions.map((s) => (
          <Link key={s.id} href={`${base}/${s.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-slate-50">
            <span className="truncate text-sm font-medium">{s.title}</span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted">{timeAgo(s.updated_at)} <ChevronRight size={14} /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
