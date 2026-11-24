"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronDown, Mic, MessagesSquare, RotateCcw, Scale, Sparkles, Target, ThumbsDown, ThumbsUp, Trophy } from "lucide-react";
import type { InterviewReport, OfferCheck } from "@/lib/tasks";
import { CopyButton, Spinner } from "./client-ui";
import { Meter } from "./ui";

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
  const [open, setOpen] = useState(0);
  const running = useRef(false);

  async function run() {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setErr("");
    const res = await fetchInsight<InterviewReport>(sessionId, "interview_report");
    setBusy(false);
    running.current = false;
    if (res.data) {
      setR(res.data);
      router.refresh();
    } else setErr(res.error ?? "Couldn't build the scorecard.");
  }

  // Open the scorecard by itself the moment the interview ends.
  useEffect(() => {
    const onEnd = (e: Event) => {
      if ((e as CustomEvent).detail?.sessionId === sessionId) run();
    };
    window.addEventListener("jc:practice-ended", onEnd);
    return () => window.removeEventListener("jc:practice-ended", onEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const head = (
    <div className="flex items-center gap-2.5">
      <span data-tone="3" className="tone-chip grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-line-2"><Trophy size={16} /></span>
      <h2 className="flex-1 text-[1.15rem] font-bold leading-tight">Your scorecard</h2>
    </div>
  );

  if (!r)
    return (
      <div className="card p-5">
        {head}
        {busy ? (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-brand-soft px-4 py-4 text-[0.9rem] font-medium text-brand-ink">
            <Spinner /> Scoring your answers...
          </div>
        ) : (
          <>
            <div className="mt-4">
              <div className="font-display text-[2rem] font-bold leading-none text-faint">?<span className="text-[0.95rem]">/10</span></div>
              <Meter value={0} className="mt-2" height={7} />
            </div>
            <p className="mt-3 text-[0.88rem] text-muted">
              {answers < 2 ? "Answer at least two questions. Your scorecard opens by itself when the interview ends." : "It opens by itself when the interview ends, or get it now."}
            </p>
            <button type="button" className="btn btn-clay mt-4 h-11 w-full" disabled={answers < 2} onClick={run}><Sparkles size={15} /> Get my scorecard</button>
          </>
        )}
        {err && <p className="mt-2 text-[0.84rem] text-bad"><AlertCircle size={13} className="mr-1 inline" />{err}</p>}
      </div>
    );

  const color = r.score >= 8 ? "var(--color-good)" : r.score >= 6 ? "var(--brand)" : "var(--color-bad)";
  return (
    <div className="card overflow-hidden fade-up">
      <div className="p-5">
        {head}
        <div className="mt-4 flex items-end gap-4">
          <div className="font-display text-[2.6rem] font-bold leading-none tabular-nums">{r.score}<span className="text-[1rem] text-muted">/10</span></div>
          <p className="min-w-0 pb-0.5 text-[0.9rem] font-medium leading-snug">{r.verdict}</p>
        </div>
        <Meter value={r.score / 10} color={color} className="mt-3" height={8} />
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-brand-soft px-3.5 py-3 text-[0.88rem] text-brand-ink">
          <Target size={15} className="mt-0.5 shrink-0" />
          <span><b className="font-semibold">Work on next:</b> {r.next_focus}</span>
        </div>
      </div>

      <div className="border-t border-line px-5 py-4">
        <div className="flex items-center gap-2"><span data-tone="2" className="tone-chip grid h-7 w-7 place-items-center rounded-lg bg-line-2"><ThumbsUp size={13} /></span><span className="font-semibold">Strongest moments</span><span className="ml-auto text-[0.8rem] text-muted">{r.strongest.length}</span></div>
        <div className="mt-3 grid gap-2">
          {r.strongest.map((x, i) => (
            <div key={i} className="rounded-xl border-l-4 border-good bg-good-soft/60 px-3.5 py-2.5">
              <div className="text-[0.9rem] font-semibold leading-snug">{x.moment}</div>
              <div className="mt-0.5 text-[0.84rem] leading-snug text-muted">{x.why}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-line px-5 py-4">
        <div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-bad-soft text-bad"><ThumbsDown size={13} /></span><span className="font-semibold">Weakest answers</span><span className="ml-auto text-[0.8rem] text-muted">{r.weakest.length}</span></div>
        <div className="mt-3 divide-y divide-line overflow-hidden rounded-2xl ring-1 ring-line">
          {r.weakest.map((w, i) => (
            <div key={i}>
              <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-start gap-3 bg-card px-3.5 py-3 text-left transition hover:bg-line-2/60">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-bad-soft text-[0.75rem] font-bold text-bad">{i + 1}</span>
                <span className="flex-1 text-[0.9rem] font-semibold leading-snug">{w.question}</span>
                <ChevronDown size={16} className={`mt-0.5 shrink-0 text-faint transition ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div className="grid gap-3 bg-line-2/50 px-3.5 pb-4 pt-2 fade-up">
                  <div className="rounded-xl border-l-4 border-bad bg-card px-3.5 py-2.5">
                    <div className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-bad">Why it was weak</div>
                    <p className="mt-1 text-[0.88rem] leading-relaxed">{w.why_weak}</p>
                  </div>
                  <div className="rounded-xl border-l-4 border-good bg-card px-3.5 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-good">A 9/10 answer</div>
                      <CopyButton text={w.better_answer} />
                    </div>
                    <p className="mt-1 text-[0.88rem] leading-relaxed">{w.better_answer}</p>
                  </div>
                </div>
              )}
            </div>
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
    below: { label: "Below market", chip: "bg-bad-soft text-bad", seg: 0, color: "var(--color-bad)" },
    at: { label: "At market", chip: "bg-brand-soft text-brand", seg: 1, color: "var(--brand)" },
    above: { label: "Above market", chip: "bg-good-soft text-good", seg: 2, color: "var(--color-good)" },
  }[o.position];
  return (
    <div className="card overflow-hidden fade-up">
      <div className="p-5">
        <div className="flex items-center gap-2.5">
          <span data-tone="0" className="tone-chip grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-line-2"><Scale size={16} /></span>
          <h2 className="flex-1 text-[1.15rem] font-bold leading-tight">Is this offer fair?</h2>
          <span className={`chip shrink-0 font-semibold ${P.chip}`}>{P.label}</span>
        </div>
        {/* Below / At / Above as three segments, the verdict highlighted */}
        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {["Below", "At", "Above"].map((l, i) => (
            <div key={l}>
              <div className="h-2 rounded-full" style={{ background: i === P.seg ? P.color : "var(--line)" }} />
              <div className={`mt-1.5 text-center text-[0.78rem] ${i === P.seg ? "font-semibold text-ink" : "text-faint"}`}>{l}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[0.88rem] leading-relaxed text-muted">{o.reasoning}</p>
        <div className="mt-4 rounded-2xl border-l-4 border-brand bg-brand-soft px-4 py-3">
          <div className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-brand">Realistic counter</div>
          <div className="mt-0.5 font-display text-[1.5rem] font-bold leading-tight text-brand-ink">{o.counter_low} - {o.counter_high}</div>
        </div>
      </div>

      <div className="border-t border-line px-5 py-4">
        <div className="flex items-center gap-2"><span data-tone="2" className="tone-chip grid h-7 w-7 place-items-center rounded-lg bg-line-2"><Mic size={13} /></span><span className="font-semibold">Say this first</span></div>
        <div className="mt-3 rounded-xl border-l-4 border-good bg-good-soft/60 px-3.5 py-3">
          <p className="text-[0.9rem] leading-relaxed">&ldquo;{o.opening_line}&rdquo;</p>
          <div className="mt-2"><CopyButton text={o.opening_line} /></div>
        </div>
      </div>

      <div className="border-t border-line px-5 py-4">
        <div className="flex items-center gap-2"><span data-tone="3" className="tone-chip grid h-7 w-7 place-items-center rounded-lg bg-line-2"><MessagesSquare size={13} /></span><span className="font-semibold">What HR will probably say</span><span className="ml-auto text-[0.8rem] text-muted">{o.objections.length}</span></div>
        <div className="mt-3 divide-y divide-line overflow-hidden rounded-2xl ring-1 ring-line">
          {o.objections.map((x, i) => (
            <details key={i} className="group bg-card open:bg-line-2/50">
              <summary className="flex cursor-pointer list-none items-start gap-3 px-3.5 py-3 transition hover:bg-line-2/60">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-line-2 text-[0.75rem] font-bold text-muted">{i + 1}</span>
                <span className="flex-1 text-[0.9rem] font-semibold leading-snug">&ldquo;{x.hr_says}&rdquo;</span>
                <ChevronDown size={16} className="mt-0.5 shrink-0 text-faint transition group-open:rotate-180" />
              </summary>
              <div className="px-3.5 pb-3.5">
                <div className="rounded-xl border-l-4 border-good bg-card px-3.5 py-2.5">
                  <div className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-good">You say</div>
                  <p className="mt-1 text-[0.88rem] leading-relaxed">{x.you_say}</p>
                </div>
              </div>
            </details>
          ))}
        </div>
        <p className="mt-3 text-[0.78rem] text-muted">A starting point. Check the market number yourself on AmbitionBox or Glassdoor.</p>
      </div>
    </div>
  );
}

/** Switch between the realistic voice call and the classic chat (+ browser voice). */
export function PracticeModes({ realistic, classic, available }: { realistic: React.ReactNode; classic: React.ReactNode; available: boolean }) {
  const [mode, setMode] = useState<"realistic" | "classic">(available ? "realistic" : "classic");
  if (!available) return <div className="flex h-full flex-col">{classic}</div>;
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="inline-flex shrink-0 gap-1 self-start rounded-full border-[1.5px] border-line p-1">
        {([["realistic", "Realistic voice"], ["classic", "Chat + basic voice"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setMode(k)} className={`h-9 rounded-full px-4 text-[0.9rem] font-semibold transition ${mode === k ? "bg-side text-cream" : "text-muted hover:text-ink"}`}>{l}</button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{mode === "realistic" ? realistic : classic}</div>
    </div>
  );
}
