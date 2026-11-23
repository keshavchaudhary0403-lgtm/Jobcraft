import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Session } from "@/lib/types";
import { timeAgo } from "./ui";

export function SessionList({ sessions, base }: { sessions: Session[]; base: string }) {
  if (!sessions.length) return null;
  return (
    <div className="fade-up">
      <div className="eyebrow mb-2">Recent</div>
      <div className="card divide-y divide-line overflow-hidden">
        {sessions.map((s) => (
          <Link key={s.id} href={`${base}/${s.id}`} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50">
            <span className="truncate font-medium">{s.title}</span>
            <span className="flex shrink-0 items-center gap-2 text-[0.82rem] text-muted">{timeAgo(s.updated_at)} <ChevronRight size={14} /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
