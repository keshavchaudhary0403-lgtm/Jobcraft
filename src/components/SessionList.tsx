import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Session } from "@/lib/types";
import { timeAgo } from "./ui";

const POS = { below: { t: "Below market", c: "bg-bad-soft text-bad" }, at: { t: "At market", c: "bg-mustard-soft text-mustard-ink" }, above: { t: "Above market", c: "bg-good-soft text-good" } } as const;

/** Past practice sessions, each with its result (interview score or offer position) at a glance. */
export function SessionList({ sessions, base, empty }: { sessions: Session[]; base: string; empty?: string }) {
  if (!sessions.length) return <p className="px-1 py-6 text-center text-[0.9rem] text-muted">{empty ?? "Nothing yet - your sessions show up here."}</p>;
  const row = (s: Session) => {
        const meta = s.meta as unknown as { interview_report?: { score?: number }; offer_check?: { position?: keyof typeof POS } };
        const score = meta.interview_report?.score;
        const pos = meta.offer_check?.position;
        return (
          <li key={s.id}>
            <Link href={`${base}/${s.id}`} className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-line-2">
              {typeof score === "number" ? (
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-[1rem] font-bold ${score >= 8 ? "bg-good-soft text-good" : score >= 6 ? "bg-mustard-soft text-mustard-ink" : "bg-bad-soft text-bad"}`}>{score}</span>
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-line-2 text-[0.78rem] text-faint">-</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-[0.92rem] font-semibold">{s.title}</span>
                <span className="flex items-center gap-2 text-[0.78rem] text-muted">
                  {timeAgo(s.updated_at)}
                  {pos && POS[pos] && <span className={`chip py-0 text-[0.78rem] ${POS[pos].c}`}>{POS[pos].t}</span>}
                  {typeof score === "number" && <span>scored {score}/10</span>}
                </span>
              </span>
              <ArrowUpRight size={15} className="shrink-0 text-faint transition group-hover:text-ink" />
            </Link>
          </li>
        );
  };
  const SHOW = 6;
  return (
    <div>
      <ul className="space-y-1.5">{sessions.slice(0, SHOW).map(row)}</ul>
      {sessions.length > SHOW && (
        <details className="group/more">
          <summary className="pill-nav mt-2 cursor-pointer list-none">
            <span className="group-open/more:hidden">Show {sessions.length - SHOW} more</span>
            <span className="hidden group-open/more:inline">Show fewer</span>
          </summary>
          <ul className="space-y-1.5">{sessions.slice(SHOW).map(row)}</ul>
        </details>
      )}
    </div>
  );
}
