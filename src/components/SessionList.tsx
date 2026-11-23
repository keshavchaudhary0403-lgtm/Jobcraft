import Link from "next/link";
import type { Session } from "@/lib/types";
import { timeAgo } from "./ui";

export function SessionList({ sessions, base, empty }: { sessions: Session[]; base: string; empty: string }) {
  if (!sessions.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="card divide-y divide-line">
      {sessions.map((s) => (
        <Link key={s.id} href={`${base}/${s.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-[#fbfaf7]">
          <span className="truncate text-sm font-medium">{s.title}</span>
          <span className="shrink-0 text-xs text-muted">{timeAgo(s.updated_at)}</span>
        </Link>
      ))}
    </div>
  );
}
