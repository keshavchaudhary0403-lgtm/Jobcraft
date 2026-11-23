"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, CircleDashed, CircleHelp, EyeOff, Lightbulb, RotateCcw, Sparkles, Target, XCircle } from "lucide-react";
import type { Application } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { createClient } from "@/lib/supabase/client";
import { Spinner, Working } from "@/components/client-ui";
import { Panel, SubLabel } from "@/components/ui";
import { useGenerate } from "@/components/useGenerate";

const MATCH = {
  strong: { icon: CheckCircle2, cls: "bg-good-soft text-good", label: "On your resume" },
  partial: { icon: CircleDashed, cls: "bg-mid-soft text-mid", label: "Partly shown" },
  missing: { icon: XCircle, cls: "bg-bad-soft text-bad", label: "Missing" },
};
const GAP = {
  lacking: { label: "Missing", cls: "bg-bad-soft text-bad", icon: XCircle },
  not_shown: { label: "Not on resume", cls: "bg-mid-soft text-mid", icon: EyeOff },
  unsure: { label: "Need your input", cls: "bg-info-soft text-info", icon: CircleHelp },
};
const TILE = ["bg-sky", "bg-sun", "bg-lilac"];

export function Overview({ app, onUpdate }: { app: Application; onUpdate: (p: Partial<Application>) => void }) {
  const a = app.analysis as Analysis | null;
  const { run, busy, error } = useGenerate<Analysis>("analysis", app.id);
  const started = useRef(false);
  const [answers, setAnswers] = useState<Record<string, string>>(app.fit_answers ?? {});

  async function analyse() {
    const res = await run();
    if (res)
      onUpdate({
        analysis: res,
        company: app.company && app.company !== "New job" ? app.company : res.company,
        role: app.role && app.role !== "Analysing…" ? app.role : res.role,
        location: app.location ?? res.location,
        company_type: app.company_type ?? res.company_type,
      });
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
        <p className="mt-3">{error}</p>
        <button className="btn btn-primary mt-4" onClick={analyse}><RotateCcw size={15} /> Try again</button>
      </div>
    );
  if (!a) return null;

  return (
    <div className={`space-y-4 stagger transition ${busy ? "opacity-60" : ""}`}>
      {/* AI-extracted insights */}
      <Panel title="AI-extracted insights" icon={<Sparkles size={15} />} action={<span className="chip hidden bg-brand-soft text-brand sm:inline-flex">{a.fit_verdict}</span>} bodyClass="divide-y divide-line">
        <div className="grid gap-5 p-5 md:grid-cols-2 md:divide-x md:divide-line">
          <div>
            <SubLabel>The real problem they&apos;re hiring for</SubLabel>
            <p className="leading-relaxed text-slate-800">{a.real_problem}</p>
          </div>
          <div className="md:pl-5">
            <SubLabel>Why this score</SubLabel>
            <p className="leading-relaxed text-slate-800">{a.fit_reasoning}</p>
          </div>
        </div>
        <div className="p-5">
          <SubLabel>Expected, but not written</SubLabel>
          <div className="mt-2 grid gap-2.5 md:grid-cols-3">
            {a.unwritten_expectations.map((x, i) => (
              <div key={x} className={`rounded-xl p-3 text-[0.9rem] leading-snug text-slate-800 ${TILE[i % 3]}`}>
                <Lightbulb size={14} className="mb-1.5 opacity-60" />
                {x}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 p-5">
          <span className="mr-1 text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-muted">ATS keywords</span>
          {a.ats_keywords.map((k) => <span key={k} className="chip bg-card px-3 text-brand ring-1 ring-brand/25">{k}</span>)}
        </div>
      </Panel>

      <div className="grid items-start gap-4 2xl:grid-cols-2">
        {/* What they want */}
        <Panel title="What they want" icon={<Target size={15} />} bodyClass="divide-y divide-line">
          {a.top_skills.map((s, i) => {
            const m = MATCH[s.match];
            return (
              <div key={s.skill} className="flex items-center gap-3 px-5 py-3 transition hover:bg-line-2/60">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-line-2 text-[0.75rem] font-semibold text-muted">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium leading-snug">{s.skill}</div>
                  <div className="text-[0.84rem] text-muted">{s.why}</div>
                </div>
                <span className={`chip shrink-0 ${m.cls}`}><m.icon size={12} /> {m.label}</span>
              </div>
            );
          })}
        </Panel>

        {/* Gaps */}
        <Panel title="Gaps to close" icon={<AlertCircle size={15} />} bodyClass="divide-y divide-line">
          {a.gaps.map((g) => {
            const m = GAP[g.status];
            return (
              <div key={g.gap} className="px-5 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{g.gap}</span>
                  <span className={`chip ${m.cls}`}><m.icon size={12} /> {m.label}</span>
                </div>
                <p className="mt-1 text-[0.88rem] text-muted">{g.explanation}</p>
              </div>
            );
          })}
        </Panel>
      </div>

      {/* Questions */}
      {a.questions.length > 0 && (
        <Panel title="Answer a few questions to sharpen your score" icon={<CircleHelp size={15} />}>
          <div className="grid gap-4 md:grid-cols-2">
            {a.questions.map((q) => (
              <div key={q}>
                <label className="mb-1.5 block font-medium text-slate-800">{q}</label>
                <textarea className="field" rows={2} value={answers[q] ?? ""} onChange={(e) => setAnswers({ ...answers, [q]: e.target.value })} placeholder="Your honest answer" />
              </div>
            ))}
          </div>
          <button className="btn btn-primary mt-4" disabled={busy} onClick={saveAnswersAndRescore}>
            {busy ? <Spinner /> : <RotateCcw size={15} />} Save &amp; re-score
          </button>
          {error && <p className="mt-2 text-bad">{error}</p>}
        </Panel>
      )}
    </div>
  );
}
