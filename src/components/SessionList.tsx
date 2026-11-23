import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Session } from "@/lib/types";
import { timeAgo } from "./ui";

const POS = { below: { t: "Below market", c: "bg-clay-soft text-clay" }, at: { t: "At market", c: "bg-mustard-soft text-[#8a6414]" }, above: { t: "Above market", c: "bg-good-soft text-good" } } as const;

/** Past practice sessions, each with its result (interview score or offer position) at a glance. */
export function SessionList({ sessions, base, empty }: { sessions: Session[]; base: string; empty?: string }) {
  if (!sessions.length) return <p className="px-1 py-6 text-center text-[0.9rem] text-muted">{empty ?? "Nothing yet — your sessions show up here."}</p>;
  return (
    <ul className="space-y-1.5">
      {sessions.map((s) => {
        const meta = s.meta as unknown as { interview_report?: { score?: number }; offer_check?: { position?: keyof typeof POS } };
        const score = meta.interview_report?.score;
        const pos = meta.offer_check?.position;
        return (
          <li key={s.id}>
            <Link href={`${base}/${s.id}`} className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-line-2">
              {typeof score === "number" ? (
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[1rem] font-bold ${score >= 8 ?"bg-good-soft text-good" : score >= 6 ? "bg-mustard-soft text-[#8a6414]" : "bg-clay-soft text-clay"}`}>{score}</span>
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-[1.5px] border-dashed border-line text-[0.78rem] text-faint">—</span>
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
      })}
    </ul>
  );
}
