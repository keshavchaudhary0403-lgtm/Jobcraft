"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight, Mic, MessageSquareText, MessagesSquare, RotateCcw, Scale, Sparkles, Target, ThumbsDown, ThumbsUp } from "lucide-react";
import type { InterviewReport, OfferCheck } from "@/lib/tasks";
import { CopyButton, Spinner } from "./client-ui";
import { SubLabel } from "./ui";

async function fetchInsight<T>(sessionId: string, kind: "interview_report" | "offer_check"): Promise<{ data?: T; error?: string }> {
  const res = await fetch("/api/sessions/insight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, kind }) });
  return res.json().catch(() => ({ error: "Something went wrong." }));
}

/** Interview scorecard (Prompt 6): score, strongest moments, weakest answers + what a 9/10 sounds like. */
export function InterviewScorecard({ sessionId, initial, answers, stale }: { sessionId: string; initial: InterviewReport | null; answers: number; stale: boolean }) {
  const router = useRouter();
  const [r, setR] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true);
    setErr("");
    const res = await fetchInsight<InterviewReport>(sessionId, "interview_report");
    setBusy(false);
    if (res.data) {
      setR(res.data);
      router.refresh();
    } else setErr(res.error ?? "Couldn't build the scorecard.");
  }

  if (!r)
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto grid h-[120px] w-[120px] place-items-center rounded-full border-[10px] border-dashed border-line">
          <span className="font-display text-[1.8rem] font-bold text-faint">?<span className="text-[0.9rem]">/10</span></span>
        </div>
        <div className="mt-4 font-display text-[1.25rem] font-bold">Your scorecard</div>
        <p className="mt-1 text-[0.88rem] text-muted">
          {answers < 2 ? "Answer at least two questions to get an honest score and what a 9/10 answer sounds like." : "Done? Get your score, best moments and fixes for the weakest answers."}
        </p>
        <button type="button" className="btn btn-clay mt-4 h-11 w-full" disabled={busy || answers < 2} onClick={run}>{busy ? <Spinner /> : <Sparkles size={15} />} Get my scorecard</button>
        {err && <p className="mt-2 text-[0.84rem] text-bad"><AlertCircle size={13} className="mr-1 inline" />{err}</p>}
      </div>
    );

  const color = r.score >= 8 ? "var(--color-good)" : r.score >= 6 ? "var(--color-mustard)" : "var(--color-clay)";
  const C = 2 * Math.PI * 52;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-4 p-5">
        <div className="donut-3d relative grid h-[120px] w-[120px] shrink-0 place-items-center">
          <svg width="120" height="120" className="-rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--line)" strokeWidth="11" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - r.score / 10)} />
          </svg>
          <span className="absolute font-display text-[2.3rem] font-bold leading-none">{r.score}<span className="text-[0.9rem] text-muted">/10</span></span>
        </div>
        <div className="min-w-0">
          <div className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-muted">Scorecard</div>
          <div className="mt-1 font-display text-[1.1rem] font-bold leading-snug">{r.verdict}</div>
        </div>
      </div>
      <div className="mx-5 flex items-start gap-2 rounded-2xl bg-brand-soft px-3.5 py-3 text-[0.88rem]"><Target size={15} className="mt-0.5 shrink-0 text-brand" /> <span><b className="font-semibold">Work on next:</b> {r.next_focus}</span></div>

      <div className="mt-4 border-t border-line px-5 py-4">
        <div className="mb-2 flex items-center gap-1.5 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-good"><ThumbsUp size={13} /> Strongest moments</div>
        <ul className="space-y-2">
          {r.strongest.map((x, i) => (
            <li key={i} className="text-[0.88rem] leading-snug"><b className="font-semibold">{x.moment}</b> <span className="text-muted">- {x.why}</span></li>
          ))}
        </ul>
      </div>
      <div className="border-t border-line px-5 py-4">
        <div className="mb-2 flex items-center gap-1.5 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-bad"><ThumbsDown size={13} /> Weakest answers</div>
        <div className="space-y-2">
          {r.weakest.map((w, i) => (
            <details key={i} className="group rounded-2xl border-[1.5px] border-line px-3.5 py-2.5 open:bg-line-2/40">
              <summary className="cursor-pointer list-none text-[0.9rem] font-semibold leading-snug">{w.question}</summary>
              <p className="mt-2 text-[0.85rem] text-muted">{w.why_weak}</p>
              <div className="mt-2 rounded-xl bg-good-soft p-3">
                <SubLabel>A 9/10 answer</SubLabel>
                <p className="text-[0.88rem] leading-relaxed">{w.better_answer}</p>
                <div className="mt-2"><CopyButton text={w.better_answer} /></div>
              </div>
            </details>
          ))}
        </div>
      </div>
      <div className="border-t border-line p-4">
        <button type="button" className="btn btn-ghost h-10 w-full" disabled={busy} onClick={run} data-tip={stale ? "You've answered more since this scorecard" : "Score again"}>
          {busy ? <Spinner size={13} /> : <RotateCcw size={14} />} {stale ? "Update scorecard" : "Score again"}
        </button>
        {err && <p className="mt-2 text-[0.84rem] text-bad">{err}</p>}
      </div>
    </div>
  );
}

/** Offer check (Prompt 7 step 1): below / at / above market, a realistic counter, the opening line, likely pushbacks. */
export function OfferCheckCard({ sessionId, initial }: { sessionId: string; initial: OfferCheck | null }) {
  const [o, setO] = useState(initial);
  const [busy, setBusy] = useState(!initial);
  const [err, setErr] = useState("");
  const started = useRef(false);

  async function run() {
    setBusy(true);
    setErr("");
    const res = await fetchInsight<OfferCheck>(sessionId, "offer_check");
    setBusy(false);
    if (res.data) setO(res.data);
    else setErr(res.error ?? "Couldn't check the offer.");
  }
  useEffect(() => {
    if (!initial && !started.current) {
      started.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (busy && !o)
    return <div className="card flex items-center gap-3 p-5 text-muted"><Spinner /> Checking your offer against the market...</div>;
  if (!o)
    return (
      <div className="card space-y-3 p-5">
        <p className="flex items-start gap-2 text-[0.9rem]"><AlertCircle size={16} className="mt-0.5 shrink-0 text-bad" /> {err}</p>
        <button type="button" className="btn btn-clay h-10 w-full" onClick={run}><RotateCcw size={13} /> Try again</button>
      </div>
    );

  const P = {
    below: { label: "Below market", cls: "text-bad", at: 18, icon: ArrowDownRight },
    at: { label: "At market", cls: "text-mustard-ink", at: 50, icon: ArrowRight },
    above: { label: "Above market", cls: "text-good", at: 82, icon: ArrowUpRight },
  }[o.position];
  return (
    <div className="card overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-1.5 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-muted"><Scale size={13} /> Is this offer fair?</div>
        <div className={`mt-1 flex items-center gap-1.5 font-display text-[1.5rem] font-bold ${P.cls}`}><P.icon size={20} /> {P.label}</div>
        <div className="relative mt-4 h-3 rounded-full bg-[linear-gradient(90deg,var(--clay-soft),var(--mustard-soft)_50%,var(--good-soft))]">
          <span className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-side shadow" style={{ left: `${P.at}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[0.78rem] text-faint"><span>Below</span><span>At</span><span>Above</span></div>
        <p className="mt-3 text-[0.88rem] leading-relaxed text-ink/85">{o.reasoning}</p>
      </div>
      <div className="mx-5 rounded-2xl bg-side px-4 py-3.5 text-cream">
        <div className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-cream/60">Realistic counter</div>
        <div className="font-display text-[1.6rem] font-bold leading-tight">{o.counter_low} - {o.counter_high}</div>
      </div>
      <div className="px-5 py-4">
        <SubLabel>Say this first</SubLabel>
        <p className="rounded-2xl border-[1.5px] border-line p-3.5 text-[0.9rem] leading-relaxed">&ldquo;{o.opening_line}&rdquo;</p>
        <div className="mt-2"><CopyButton text={o.opening_line} /></div>
      </div>
      <div className="border-t border-line px-5 py-4">
        <div className="mb-2 flex items-center gap-1.5 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-muted"><MessagesSquare size={13} /> What HR will probably say</div>
        <div className="space-y-2">
          {o.objections.map((x, i) => (
            <details key={i} className="rounded-2xl border-[1.5px] border-line px-3.5 py-2.5 open:bg-line-2/40">
              <summary className="flex cursor-pointer list-none items-start gap-2 text-[0.88rem]"><MessageSquareText size={14} className="mt-0.5 shrink-0 text-muted" /> &ldquo;{x.hr_says}&rdquo;</summary>
              <p className="mt-2 flex items-start gap-2 text-[0.88rem] font-medium"><Mic size={14} className="mt-0.5 shrink-0 text-brand" /> {x.you_say}</p>
            </details>
          ))}
        </div>
        <p className="mt-3 text-[0.76rem] text-faint">A starting point. Check AmbitionBox or Glassdoor.</p>
      </div>
    </div>
  );
}

/** Switch between the realistic voice call and the classic chat (+ browser voice). */
export function PracticeModes({ realistic, classic, available }: { realistic: React.ReactNode; classic: React.ReactNode; available: boolean }) {
  const [mode, setMode] = useState<"realistic" | "classic">(available ? "realistic" : "classic");
  if (!available) return <>{classic}</>;
  return (
    <div className="space-y-4">
      <div className="inline-flex gap-1 rounded-full border-[1.5px] border-line p-1">
        {([["realistic", "Realistic voice"], ["classic", "Chat + basic voice"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setMode(k)} className={`h-9 rounded-full px-4 text-[0.9rem] font-semibold transition ${mode === k ? "bg-side text-cream" : "text-muted hover:text-ink"}`}>{l}</button>
        ))}
      </div>
      {mode === "realistic" ? realistic : classic}
    </div>
  );
}
