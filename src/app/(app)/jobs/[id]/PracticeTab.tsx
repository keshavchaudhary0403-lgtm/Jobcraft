import Link from "next/link";
import { ArrowRight, IndianRupee, Mic } from "lucide-react";
import type { Application, Session } from "@/lib/types";
import { startSession } from "@/lib/actions";
import { timeAgo } from "@/components/ui";

const scoreOf = (s: Session) => {
  const r = (s.meta as unknown as { interview_report?: { score?: number } } | null)?.interview_report;
  return typeof r?.score === "number" ? r.score : null;
};

export function PracticeTab({ app, interviews }: { app: Application; interviews: Session[] }) {
  const start = startSession.bind(null, "interview");
  const rounds = [...interviews].reverse().slice(-6); // oldest → newest
  const scored = rounds.map(scoreOf).filter((x): x is number => x != null);
  const best = scored.length ? Math.max(...scored) : null;
  const done = Math.min(interviews.length, 3);

  return (
    <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.85fr)] stagger">
      {/* Mock interview */}
      <section className="card flex flex-col p-6">
        <div className="flex items-center gap-3">
          <span data-tone="2" className="tone-chip grid h-12 w-12 place-items-center rounded-xl bg-line-2"><Mic size={21} /></span>
          <div>
            <div className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-muted">Mock interview</div>
            <h3 className="text-[1.4rem] font-bold leading-tight">{app.company.replace(/\(.*?\)/g, "").trim()}&apos;s hiring manager</h3>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[["6", "questions"], ["Voice", "or chat"], ["/10", "honest score"]].map(([v, l]) => (
            <div key={l} className="rounded-2xl bg-line-2 px-2 py-3">
              <div className="font-display text-[1.15rem] font-bold">{v}</div>
              <div className="text-[0.8rem] text-muted">{l}</div>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <div className="flex justify-between text-[0.8rem]"><span className="text-muted">Practice goal</span><span className="font-semibold">{done} of 3 rounds</span></div>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">{[0, 1, 2].map((i) => <span key={i} className={`h-2 rounded-full ${i < done ? "bg-good" : "bg-line-2"}`} />)}</div>
        </div>
        <form action={start} className="mt-auto pt-6">
          <input type="hidden" name="application_id" value={app.id} />
          <button className="btn btn-clay h-11 w-full">Start a round <ArrowRight size={16} /></button>
        </form>
      </section>

      {/* Rounds history */}
      <section className="card flex flex-col p-6">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[1.25rem] font-bold">Your rounds{rounds.length > 10 && <span className="ml-2 text-[0.8rem] font-medium text-muted">last 10</span>}</h3>
          {best != null && <span className="text-[0.82rem] text-muted">Best <b className="font-display text-ink">{best}/10</b></span>}
        </div>
        {rounds.length ? (
          <>
            <div className="mt-4 flex h-32 items-end gap-2 border-b border-line pb-1">
              {rounds.slice(-10).map((s, j) => {
                const i = Math.max(0, rounds.length - 10) + j;
                const sc = scoreOf(s);
                return (
                  <Link key={s.id} href={`/interview/${s.id}`} data-tip={sc != null ? `Round ${i + 1}: ${sc}/10` : `Round ${i + 1}: no scorecard yet`} className="group flex flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[0.78rem] font-semibold tabular-nums text-muted">{sc ?? "-"}</span>
                    <span className={`w-full max-w-[38px] rounded-t-lg transition group-hover:opacity-80 ${sc == null ? "bg-line" : sc >= 8 ? "bg-good" : sc >= 6 ? "bg-mustard" : "bg-bad"}`} style={{ height: `${sc != null ? Math.max(sc * 10, 8) : 12}%` }} />
                  </Link>
                );
              })}
            </div>
            <ul className="mt-3 space-y-1">
              {interviews.slice(0, 3).map((s, i) => (
                <li key={s.id}>
                  <Link href={`/interview/${s.id}`} className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-[0.88rem] hover:bg-line-2">
                    <span className="font-medium">Round {interviews.length - i}</span>
                    <span className="text-muted">{scoreOf(s) != null ? `${scoreOf(s)}/10 · ` : ""}{timeAgo(s.updated_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="mt-4 grid flex-1 place-items-center rounded-2xl border-[1.5px] border-dashed border-line p-6 text-center text-[0.9rem] text-muted">
            Your scores will chart here after each round.
          </div>
        )}
      </section>

      {/* Salary */}
      <section className="card flex flex-col p-6">
        <span data-tone="3" className="tone-chip grid h-12 w-12 place-items-center rounded-xl bg-line-2"><IndianRupee size={21} /></span>
        <h3 className="mt-4 text-[1.35rem] font-bold leading-tight">Salary talk</h3>
        <p className="mt-1 text-[0.9rem] text-muted">{app.status === "offer" ? "You have an offer - check it against the market, then practise with HR." : "When the offer comes: check it, then rehearse the call."}</p>
        <Link href={`/negotiation?app=${app.id}`} className="btn btn-primary mt-auto h-11 w-full">{app.status === "offer" ? "Check my offer" : "Practise anyway"} <ArrowRight size={16} /></Link>
      </section>
    </div>
  );
}
