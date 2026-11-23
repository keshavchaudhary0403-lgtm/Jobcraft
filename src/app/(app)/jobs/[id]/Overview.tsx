"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, CircleDashed, CircleHelp, EyeOff, RotateCcw, Sparkles, XCircle } from "lucide-react";
import type { Application } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { createClient } from "@/lib/supabase/client";
import { ScoreRing } from "@/components/ui";
import { Spinner, Working } from "@/components/client-ui";
import { useGenerate } from "@/components/useGenerate";

const MATCH = {
  strong: { icon: CheckCircle2, cls: "text-good", label: "Strong" },
  partial: { icon: CircleDashed, cls: "text-mid", label: "Partial" },
  missing: { icon: XCircle, cls: "text-bad", label: "Missing" },
};
const GAP = {
  lacking: { label: "Missing", cls: "bg-bad-soft text-bad", icon: XCircle },
  not_shown: { label: "Not on resume", cls: "bg-mid-soft text-mid", icon: EyeOff },
  unsure: { label: "Need your input", cls: "bg-blue-50 text-blue-700", icon: CircleHelp },
};

export function Overview({ app, onUpdate, onNext }: { app: Application; onUpdate: (p: Partial<Application>) => void; onNext: () => void }) {
  const a = app.analysis as Analysis | null;
  const { run, busy, error } = useGenerate<Analysis>("analysis", app.id);
  const started = useRef(false);
  const [answers, setAnswers] = useState<Record<string, string>>(app.fit_answers ?? {});

  async function analyse() {
    const res = await run();
    if (res) onUpdate({ analysis: res, company: res.company, role: res.role, location: app.location ?? res.location, company_type: app.company_type ?? res.company_type });
  }

  useEffect(() => {
    if (!a && !started.current) {
      started.current = true;
      analyse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveAnswersAndRescore() {
    await createClient().from("applications").update({ fit_answers: answers }).eq("id", app.id);
    onUpdate({ fit_answers: answers });
    await analyse();
  }

  if (busy && !a) return <Working steps={["Reading the job description…", "Finding what they really want…", "Comparing it with your resume…", "Scoring your fit…"]} />;
  if (error && !a)
    return (
      <div className="card flex flex-col items-center p-10 text-center">
        <AlertCircle className="text-bad" />
        <p className="mt-3 text-sm">{error}</p>
        <button className="btn btn-primary mt-4" onClick={analyse}><RotateCcw size={15} /> Try again</button>
      </div>
    );
  if (!a) return null;

  const openQs = a.questions.filter((q) => !(app.fit_answers ?? {})[q]?.trim());

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr] stagger">
      {/* Match */}
      <section className="card p-6">
        <div className="flex items-center gap-6">
          <ScoreRing score={a.fit_score} />
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wider text-faint">Your match</div>
            <div className="mt-1 text-lg font-semibold leading-snug">{a.fit_verdict}</div>
            <p className="mt-1.5 text-sm text-slate-600">{a.fit_reasoning}</p>
          </div>
        </div>
        <div className="mt-6 space-y-2.5">
          {a.gaps.map((g) => {
            const m = GAP[g.status];
            return (
              <div key={g.gap} className="rounded-xl border border-line p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{g.gap}</span>
                  <span className={`chip ${m.cls}`}><m.icon size={12} /> {m.label}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{g.explanation}</p>
              </div>
            );
          })}
        </div>
        {busy && <div className="mt-4 flex items-center gap-2 text-sm text-muted"><Spinner /> Re-scoring…</div>}
      </section>

      {/* What they want */}
      <section className="card p-6">
        <div className="text-xs font-medium uppercase tracking-wider text-faint">What they want</div>
        <ul className="mt-3 space-y-2.5">
          {a.top_skills.map((s, i) => {
            const m = MATCH[s.match];
            return (
              <li key={s.skill} className="flex items-start gap-3">
                <span className="mt-0.5 w-4 text-xs font-semibold tabular-nums text-faint">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{s.skill}</div>
                  <div className="text-xs text-muted">{s.why}</div>
                </div>
                <m.icon size={18} className={`shrink-0 ${m.cls}`} aria-label={m.label} />
              </li>
            );
          })}
        </ul>
        <div className="mt-6 text-xs font-medium uppercase tracking-wider text-faint">ATS keywords</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {a.ats_keywords.map((k) => (
            <span key={k} className="chip bg-brand-soft text-brand-ink">{k}</span>
          ))}
        </div>
      </section>

      {/* Questions */}
      {a.questions.length > 0 && (
        <section className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand" />
            <span className="font-medium">A few questions to sharpen your score</span>
            {openQs.length === 0 && <span className="chip bg-good-soft text-good">Answered</span>}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {a.questions.map((q) => (
              <div key={q}>
                <label className="mb-1.5 block text-sm text-slate-700">{q}</label>
                <textarea className="field" rows={2} value={answers[q] ?? ""} onChange={(e) => setAnswers({ ...answers, [q]: e.target.value })} placeholder="Your honest answer" />
              </div>
            ))}
          </div>
          <button className="btn btn-primary mt-4" disabled={busy} onClick={saveAnswersAndRescore}>
            {busy ? <Spinner /> : <RotateCcw size={15} />} Save &amp; re-score
          </button>
          {error && <p className="mt-2 text-sm text-bad">{error}</p>}
        </section>
      )}

      {/* Insight */}
      <section className="card p-6">
        <div className="text-xs font-medium uppercase tracking-wider text-faint">The real problem they&apos;re hiring for</div>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-700">{a.real_problem}</p>
      </section>
      <section className="card p-6">
        <div className="text-xs font-medium uppercase tracking-wider text-faint">Expected, but not written</div>
        <ul className="mt-3 space-y-2">
          {a.unwritten_expectations.map((x) => (
            <li key={x} className="flex gap-2.5 text-sm text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /> {x}</li>
          ))}
        </ul>
      </section>

      <div className="flex justify-end lg:col-span-2">
        <button className="btn btn-brand px-5" onClick={onNext}>Tailor my resume <ArrowRight size={16} /></button>
      </div>
    </div>
  );
}
