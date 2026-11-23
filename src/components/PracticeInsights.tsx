"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight, Award, Mic, MessageSquareText, MessagesSquare, RotateCcw, Scale, Sparkles, Target, ThumbsDown, ThumbsUp } from "lucide-react";
import type { InterviewReport, OfferCheck } from "@/lib/tasks";
import { CopyButton, Spinner } from "./client-ui";
import { Panel, SubLabel } from "./ui";

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
      <div className="card mb-5 flex flex-wrap items-center gap-4 p-5 fade-up">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><Award size={18} /></span>
        <div className="min-w-0 flex-1">
          <div className="font-bold">Your scorecard</div>
          <div className="text-[0.9rem] text-muted">
            {answers < 2 ? "Answer at least two questions, then get an honest score and what a 9/10 answer sounds like." : "Done with the interview? Get your score, strongest moments and how to fix the weakest answers."}
          </div>
        </div>
        <button className="btn btn-primary" disabled={busy || answers < 2} onClick={run}>{busy ? <Spinner /> : <Sparkles size={15} />} Get my scorecard</button>
        {err && <p className="w-full text-[0.86rem] text-bad"><AlertCircle size={13} className="mr-1 inline" />{err}</p>}
      </div>
    );

  const tone = r.score >= 8 ? "text-good" : r.score >= 6 ? "text-mid" : "text-bad";
  return (
    <div className="mb-6 space-y-4 fade-up">
      <div className="card flex flex-wrap items-center gap-5 p-5">
        <div className="flex items-baseline gap-1">
          <span className={`text-[2.8rem] font-bold leading-none tracking-tight ${tone}`}>{r.score}</span>
          <span className="text-muted">/10</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-muted">Interview scorecard</div>
          <div className="text-[1.1rem] font-bold leading-snug">{r.verdict}</div>
          <div className="mt-1 flex items-start gap-1.5 text-[0.92rem] text-slate-700"><Target size={15} className="mt-0.5 shrink-0 text-brand" /> {r.next_focus}</div>
        </div>
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={run} title={stale ? "You've answered more since this scorecard" : "Score again"}>
          {busy ? <Spinner size={13} /> : <RotateCcw size={13} />} {stale ? "Update scorecard" : "Score again"}
        </button>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Panel title="Strongest moments" icon={<ThumbsUp size={15} />} bodyClass="divide-y divide-line">
          {r.strongest.map((s, i) => (
            <div key={i} className="px-5 py-3.5">
              <div className="font-semibold leading-snug text-slate-800">{s.moment}</div>
              <div className="mt-0.5 text-[0.88rem] text-muted">{s.why}</div>
            </div>
          ))}
        </Panel>
        <Panel title="Weakest answers — and a 9/10 version" icon={<ThumbsDown size={15} />} bodyClass="divide-y divide-line">
          {r.weakest.map((w, i) => (
            <div key={i} className="space-y-2.5 px-5 py-4">
              <div className="font-semibold leading-snug">{w.question}</div>
              <div className="flex items-start gap-2 text-[0.9rem] text-slate-700"><AlertCircle size={14} className="mt-0.5 shrink-0 text-bad" /> {w.why_weak}</div>
              <div className="rounded-xl border border-good/20 bg-good-soft/50 p-3.5">
                <SubLabel>A 9/10 answer</SubLabel>
                <p className="text-[0.93rem] leading-relaxed text-slate-800">{w.better_answer}</p>
                <div className="mt-2"><CopyButton text={w.better_answer} /></div>
              </div>
            </div>
          ))}
        </Panel>
      </div>
      {err && <p className="text-[0.86rem] text-bad">{err}</p>}
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
    return (
      <div className="card mb-5 flex items-center gap-3 p-5 text-muted fade-up"><Spinner /> Checking your offer against the market…</div>
    );
  if (!o)
    return (
      <div className="card mb-5 flex flex-wrap items-center gap-3 p-5 fade-up">
        <AlertCircle size={16} className="text-bad" /> <span className="flex-1">{err}</span>
        <button className="btn btn-primary btn-sm" onClick={run}><RotateCcw size={13} /> Try again</button>
      </div>
    );

  const P = {
    below: { label: "Below market", cls: "bg-bad-soft text-bad", icon: ArrowDownRight },
    at: { label: "At market", cls: "bg-mid-soft text-mid", icon: ArrowRight },
    above: { label: "Above market", cls: "bg-good-soft text-good", icon: ArrowUpRight },
  }[o.position];
  return (
    <div className="mb-6 grid items-start gap-4 fade-up lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Panel title="Is this offer fair?" icon={<Scale size={15} />} action={<span className={`chip ${P.cls}`}><P.icon size={12} /> {P.label}</span>}>
        <p className="leading-relaxed text-slate-800">{o.reasoning}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-brand-soft px-4 py-3">
          <span className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-brand-ink">Realistic counter</span>
          <span className="text-[1.25rem] font-bold tracking-tight text-ink">{o.counter_low} – {o.counter_high}</span>
        </div>
        <div className="mt-4">
          <SubLabel>Say this first</SubLabel>
          <p className="rounded-xl border border-line bg-white p-3.5 leading-relaxed text-slate-800">&ldquo;{o.opening_line}&rdquo;</p>
          <div className="mt-2"><CopyButton text={o.opening_line} /></div>
        </div>
        <p className="mt-3 text-[0.8rem] text-faint">Check the market number yourself on AmbitionBox or Glassdoor — this is a starting point, not the truth.</p>
      </Panel>
      <Panel title="What HR will probably say" icon={<MessagesSquare size={15} />} bodyClass="divide-y divide-line">
        {o.objections.map((x, i) => (
          <div key={i} className="space-y-1.5 px-5 py-3.5">
            <div className="flex items-start gap-2 text-[0.92rem] text-slate-700"><MessageSquareText size={14} className="mt-0.5 shrink-0 text-muted" /> &ldquo;{x.hr_says}&rdquo;</div>
            <div className="flex items-start gap-2 text-[0.92rem] font-medium text-ink"><Mic size={14} className="mt-0.5 shrink-0 text-brand" /> {x.you_say}</div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

/** Switch between the realistic voice call and the classic chat (+ browser voice). */
export function PracticeModes({ realistic, classic, available }: { realistic: React.ReactNode; classic: React.ReactNode; available: boolean }) {
  const [mode, setMode] = useState<"realistic" | "classic">(available ? "realistic" : "classic");
  if (!available) return <>{classic}</>;
  return (
    <div className="space-y-4">
      <div className="inline-flex gap-1 rounded-xl bg-line-2 p-1">
        {([["realistic", "Realistic voice"], ["classic", "Chat + basic voice"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} className={`h-8 rounded-lg px-3.5 text-[0.9rem] font-semibold transition ${mode === k ? "bg-white text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink"}`}>{l}</button>
        ))}
      </div>
      {mode === "realistic" ? realistic : classic}
    </div>
  );
}
