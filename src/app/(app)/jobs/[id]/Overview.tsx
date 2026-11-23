"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  CircleHelp,
  EyeOff,
  FileText,
  Lightbulb,
  Mic,
  MessageSquareQuote,
  RotateCcw,
  Sparkles,
  Square,
  Target,
  XCircle,
} from "lucide-react";
import type { Application } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { createClient } from "@/lib/supabase/client";
import { Modal, Spinner, Working, useAsk } from "@/components/client-ui";
import { Panel, SubLabel } from "@/components/ui";
import { useGenerate } from "@/components/useGenerate";
import { useVoice } from "@/components/useVoice";

const MATCH = {
  strong: { icon: CheckCircle2, cls: "bg-good-soft text-good", label: "On your resume" },
  partial: { icon: CircleDashed, cls: "bg-mid-soft text-mid", label: "Partly shown" },
  missing: { icon: XCircle, cls: "bg-bad-soft text-bad", label: "Missing" },
};
const GAP = {
  lacking: { label: "Missing", cls: "bg-bad-soft text-bad", icon: XCircle, hint: "You don't have this yet — handle it honestly." },
  not_shown: { label: "Not on resume", cls: "bg-mid-soft text-mid", icon: EyeOff, hint: "You likely have it — your resume doesn't show it." },
  unsure: { label: "Need your input", cls: "bg-info-soft text-info", icon: CircleHelp, hint: "Answer the question so the score is accurate." },
};
const TILE = ["bg-sky", "bg-sun", "bg-lilac"];

/** All questions the recruiter wants answered (gap questions + extra ones), no duplicates. */
export function questionList(a: Analysis | null): string[] {
  if (!a) return [];
  const all = [...(a.questions ?? []), ...(a.gaps ?? []).map((g) => g.question).filter((q): q is string => !!q)];
  return [...new Set(all.map((q) => q.trim()))].filter(Boolean);
}

type Props = {
  app: Application;
  onUpdate: (p: Partial<Application>) => void;
  /** Index of the question to open in the answer flow (null = closed). Controlled by the job page. */
  askAt: number | null;
  onAsk: (i: number | null) => void;
  onGo: (tab: "resume") => void;
};

export function Overview({ app, onUpdate, askAt, onAsk, onGo }: Props) {
  const a = app.analysis as Analysis | null;
  const { run, busy, error } = useGenerate<Analysis>("analysis", app.id);
  const started = useRef(false);
  const [answers, setAnswers] = useState<Record<string, string>>(app.fit_answers ?? {});
  const [open, setOpen] = useState<number | null>(null);
  const [confirm, dialog] = useAsk();

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

  async function persist(next: Record<string, string>) {
    setAnswers(next);
    await createClient().from("applications").update({ fit_answers: next }).eq("id", app.id);
    onUpdate({ fit_answers: next });
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

  const questions = questionList(a);
  const answered = questions.filter((q) => answers[q]?.trim()).length;
  const scored = a.scored_with ?? {};
  const changedSinceScore = questions.some((q) => (answers[q]?.trim() ?? "") !== (scored[q]?.trim() ?? ""));
  const detailed = a.top_skills.some((s) => s.evidence !== undefined);
  const missingKw = new Set(a.keywords_missing ?? []);

  async function refresh() {
    const ok = await confirm({ title: "Refresh the analysis?", body: "Runs the recruiter analysis again with your latest resume and answers. Uses AI credit.", confirm: "Refresh" });
    if (ok !== null) analyse();
  }

  return (
    <div className="space-y-4">
      {dialog}
      {busy && (
        <div className="flex items-center gap-2.5 rounded-xl border border-brand/20 bg-brand-soft px-4 py-3 text-[0.92rem] text-brand-ink fade-up">
          <Spinner size={15} /> Re-scoring with your latest answers…
        </div>
      )}

      <div className={`space-y-4 stagger transition ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {/* Recruiter's read */}
        <Panel
          title="Recruiter's read"
          icon={<Sparkles size={15} />}
          action={<span className="chip hidden bg-brand-soft text-brand-ink sm:inline-flex">{a.fit_verdict}</span>}
          bodyClass="divide-y divide-line"
        >
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
            {a.ats_keywords.map((k) =>
              a.keywords_missing && missingKw.has(k) ? (
                <span key={k} title="Not on your resume yet — add it where it's true" className="chip border border-dashed border-mid/50 bg-mid-soft/50 px-3 text-mid">
                  <XCircle size={12} /> {k}
                </span>
              ) : (
                <span key={k} title={a.keywords_missing ? "Already on your resume" : undefined} className="chip bg-card px-3 text-brand-ink ring-1 ring-brand/25">
                  {a.keywords_missing && <Check size={12} className="text-good" />} {k}
                </span>
              ),
            )}
            {a.keywords_missing && a.keywords_missing.length > 0 && (
              <span className="text-[0.82rem] text-muted">· {a.keywords_missing.length} missing from your resume</span>
            )}
          </div>
        </Panel>

        {/* What they want */}
        <Panel
          title="What they want"
          sub="Ranked by how much the job description stresses it. Click any row for details."
          icon={<Target size={15} />}
          bodyClass="divide-y divide-line"
          action={
            !detailed ? (
              <button className="btn btn-ghost btn-sm" onClick={refresh}><RotateCcw size={13} /> Get details</button>
            ) : undefined
          }
        >
          {a.top_skills.map((s, i) => {
            const m = MATCH[s.match];
            const isOpen = open === i;
            return (
              <div key={s.skill}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className={`flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-line-2/60 ${isOpen ? "bg-line-2/40" : ""}`}
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-line-2 text-[0.75rem] font-semibold text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold leading-snug">{s.skill}</div>
                    <div className="text-[0.84rem] text-muted">{s.why}</div>
                  </div>
                  <span className={`chip shrink-0 ${m.cls}`}><m.icon size={12} /> {m.label}</span>
                  <ChevronDown size={16} className={`shrink-0 text-faint transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="grid gap-3 bg-line-2/40 px-5 pb-4 pl-14 fade-up md:grid-cols-2">
                    {s.evidence === undefined ? (
                      <p className="text-[0.9rem] text-muted md:col-span-2">
                        This job was analysed before details were available.{" "}
                        <button className="font-semibold text-brand-ink hover:underline" onClick={refresh}>Refresh the analysis</button> to see where it shows on your resume and how to fix it.
                      </p>
                    ) : (
                      <>
                        <div className="rounded-xl border border-line bg-white p-3.5">
                          <SubLabel>On your resume</SubLabel>
                          {s.evidence ? (
                            <p className="flex gap-2 text-[0.92rem] leading-relaxed text-slate-800">
                              <MessageSquareQuote size={15} className="mt-0.5 shrink-0 text-brand-2" />
                              <span>&ldquo;{s.evidence}&rdquo;</span>
                            </p>
                          ) : (
                            <p className="text-[0.92rem] text-muted">Nothing on your resume shows this yet.</p>
                          )}
                        </div>
                        {s.match === "strong" ? (
                          <div className="rounded-xl border border-good/20 bg-good-soft/60 p-3.5 text-[0.92rem] text-slate-800">
                            <SubLabel>Verdict</SubLabel>
                            Clearly proven — keep it near the top of your resume for this job.
                          </div>
                        ) : (
                          <div className="rounded-xl border border-line bg-white p-3.5">
                            {s.gap_note && (
                              <>
                                <SubLabel>What&apos;s missing</SubLabel>
                                <p className="text-[0.92rem] leading-relaxed text-slate-800">{s.gap_note}</p>
                              </>
                            )}
                            {s.how_to_show && (
                              <>
                                <div className="mt-3"><SubLabel>How to show it</SubLabel></div>
                                <p className="text-[0.92rem] leading-relaxed text-slate-800">{s.how_to_show}</p>
                              </>
                            )}
                            <button className="btn btn-ghost btn-sm mt-3" onClick={() => onGo("resume")}><FileText size={13} /> Fix in resume</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </Panel>

        {/* Gaps */}
        <Panel title="Gaps to close" sub="Where your resume falls short for this job — and what to do about each." icon={<AlertCircle size={15} />} bodyClass="divide-y divide-line">
          {a.gaps.map((g) => {
            const m = GAP[g.status];
            const qi = g.question ? questions.indexOf(g.question.trim()) : -1;
            const ans = g.question ? answers[g.question.trim()]?.trim() : "";
            return (
              <div key={g.gap} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{g.gap}</div>
                    <p className="mt-0.5 text-[0.9rem] text-muted">{g.explanation}</p>
                  </div>
                  <span className={`chip ${m.cls}`} title={m.hint}><m.icon size={12} /> {m.label}</span>
                </div>
                {g.how_to_close && (
                  <div className="mt-3 rounded-xl bg-line-2/60 p-3.5">
                    <SubLabel>How to close it</SubLabel>
                    <p className="text-[0.92rem] leading-relaxed text-slate-800">{g.how_to_close}</p>
                  </div>
                )}
                {(qi >= 0 || g.status === "not_shown") && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {qi >= 0 && (
                      ans ? (
                        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-good/25 bg-good-soft/50 px-3.5 py-2.5">
                          <CheckCircle2 size={15} className="shrink-0 text-good" />
                          <span className="line-clamp-1 flex-1 text-[0.9rem] text-slate-700">{ans}</span>
                          <button className="shrink-0 text-[0.85rem] font-semibold text-brand-ink hover:underline" onClick={() => onAsk(qi)}>Edit answer</button>
                        </div>
                      ) : (
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 rounded-xl border border-info/25 bg-info-soft/50 px-3.5 py-2.5">
                          <CircleHelp size={15} className="shrink-0 text-info" />
                          <span className="min-w-0 flex-1 text-[0.9rem] font-medium text-slate-800">{g.question}</span>
                          <button className="btn btn-primary btn-sm" onClick={() => onAsk(qi)}>Answer</button>
                        </div>
                      )
                    )}
                    {g.status === "not_shown" && (
                      <button className="btn btn-ghost btn-sm" onClick={() => onGo("resume")}><FileText size={13} /> Fix in resume</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </Panel>

        {/* Questions */}
        {questions.length > 0 && (
          <Panel
            title="The recruiter's questions"
            sub="Your answers decide the gaps marked “Need your input” — and make your resume and outreach stronger."
            icon={<CircleHelp size={15} />}
            action={<span className="chip bg-line-2 text-muted">{answered} of {questions.length} answered</span>}
            bodyClass="divide-y divide-line"
          >
            {questions.map((q, i) => {
              const ans = answers[q]?.trim();
              return (
                <button key={q} onClick={() => onAsk(i)} className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition hover:bg-line-2/60">
                  <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.75rem] font-semibold ${ans ? "bg-good-soft text-good" : "bg-line-2 text-muted"}`}>
                    {ans ? <Check size={13} strokeWidth={3} /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium leading-snug text-slate-800">{q}</div>
                    <div className={`mt-0.5 line-clamp-1 text-[0.86rem] ${ans ? "text-muted" : "text-faint"}`}>{ans || "Not answered yet"}</div>
                  </div>
                  <span className="shrink-0 text-[0.85rem] font-semibold text-brand-ink">{ans ? "Edit" : "Answer"}</span>
                </button>
              );
            })}
            <div className="flex flex-wrap items-center gap-3 bg-line-2/40 px-5 py-3.5">
              {answered < questions.length && (
                <button className="btn btn-primary" onClick={() => onAsk(Math.max(0, questions.findIndex((q) => !answers[q]?.trim())))}>
                  Answer {questions.length - answered === questions.length ? "questions" : `${questions.length - answered} left`} <ArrowRight size={15} />
                </button>
              )}
              <button className={`btn ${answered === questions.length ? "btn-primary" : "btn-ghost"}`} disabled={busy || !answered || !changedSinceScore} onClick={analyse}>
                {busy ? <Spinner /> : <RotateCcw size={15} />} Re-score with my answers
              </button>
              <span className="text-[0.84rem] text-muted">
                {!answered ? "Answer at least one to re-score." : changedSinceScore ? "Your score doesn't include your latest answers yet." : "Score is up to date with your answers."}
              </span>
            </div>
            {error && <p className="px-5 py-3 text-bad">{error}</p>}
          </Panel>
        )}
      </div>

      <AnswerFlow
        open={askAt !== null}
        start={askAt ?? 0}
        questions={questions}
        gaps={a.gaps}
        answers={answers}
        onClose={() => onAsk(null)}
        onSave={persist}
        onRescore={async () => {
          onAsk(null);
          await analyse();
        }}
      />
    </div>
  );
}

/** One question at a time, a big writing area, optional dictation. Saves as you go. */
function AnswerFlow({
  open,
  start,
  questions,
  gaps,
  answers,
  onClose,
  onSave,
  onRescore,
}: {
  open: boolean;
  start: number;
  questions: string[];
  gaps: Analysis["gaps"];
  answers: Record<string, string>;
  onClose: () => void;
  onSave: (next: Record<string, string>) => Promise<void>;
  onRescore: () => Promise<void>;
}) {
  if (!open || !questions.length) return null;
  return <AnswerFlowInner key={start} start={start} questions={questions} gaps={gaps} answers={answers} onClose={onClose} onSave={onSave} onRescore={onRescore} />;
}

function AnswerFlowInner({
  start,
  questions,
  gaps,
  answers,
  onClose,
  onSave,
  onRescore,
}: {
  start: number;
  questions: string[];
  gaps: Analysis["gaps"];
  answers: Record<string, string>;
  onClose: () => void;
  onSave: (next: Record<string, string>) => Promise<void>;
  onRescore: () => Promise<void>;
}) {
  const [i, setI] = useState(Math.min(start, questions.length - 1));
  const [draft, setDraft] = useState<Record<string, string>>(answers);
  const [saving, setSaving] = useState(false);
  const v = useVoice();
  const q = questions[i];
  const gap = gaps.find((g) => g.question?.trim() === q);
  const last = i === questions.length - 1;
  const done = questions.filter((x) => draft[x]?.trim()).length;

  async function save() {
    if (v.listening) v.stopListening();
    const changed = questions.some((x) => (draft[x] ?? "") !== (answers[x] ?? ""));
    if (!changed) return;
    setSaving(true);
    await onSave(draft);
    setSaving(false);
  }
  async function go(n: number) {
    await save();
    setI(n);
  }
  async function close() {
    await save();
    onClose();
  }
  function dictate() {
    if (v.listening) return v.stopListening();
    v.startListening((t) => setDraft((d) => ({ ...d, [q]: `${(d[q] ?? "").trim()}${d[q]?.trim() ? " " : ""}${t.trim()}` })));
  }

  return (
    <Modal open onClose={close} title={`Question ${i + 1} of ${questions.length}`} width={720}>
      <div className="mb-5 flex gap-1.5">
        {questions.map((x, n) => (
          <button
            key={x}
            onClick={() => go(n)}
            aria-label={`Question ${n + 1}`}
            className={`h-1.5 flex-1 rounded-full transition ${n === i ? "bg-brand" : draft[x]?.trim() ? "bg-brand-2" : "bg-line-2 hover:bg-line"}`}
          />
        ))}
      </div>

      {gap && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[0.84rem] text-muted">
          <span className="chip bg-info-soft text-info"><CircleHelp size={12} /> About: {gap.gap}</span>
          <span className="line-clamp-1">{gap.explanation}</span>
        </div>
      )}
      <h3 className="text-[1.2rem] font-bold leading-snug tracking-tight text-ink">{q}</h3>
      <p className="mt-1 text-[0.88rem] text-muted">Be specific: what you did, how many, and what changed. Only what&apos;s true — it goes into your resume and outreach.</p>

      <div className="relative mt-4">
        <textarea
          key={q}
          autoFocus
          className="field min-h-[200px] pb-12 text-[1rem] leading-relaxed [field-sizing:content]"
          placeholder="e.g. Yes — I set up how we chose new partners, onboarded about 40 in three months and trained them on our quality checklist. Complaints dropped from 12% to 5%."
          value={draft[q] ?? ""}
          onChange={(e) => setDraft({ ...draft, [q]: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              if (!last) go(i + 1);
            }
          }}
        />
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
          {v.supported.listen ? (
            <button type="button" onClick={dictate} className={`btn btn-sm ${v.listening ? "bg-bad text-white" : "btn-ghost"}`}>
              {v.listening ? <><Square size={12} fill="currentColor" /> Stop</> : <><Mic size={13} /> Speak your answer</>}
            </button>
          ) : <span />}
          <span className="text-[0.78rem] tabular-nums text-faint">{(draft[q] ?? "").trim().split(/\s+/).filter(Boolean).length} words</span>
        </div>
      </div>
      {v.listening && v.transcript && <p className="mt-2 text-[0.88rem] italic text-muted">{v.transcript}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <button className="btn btn-ghost" disabled={i === 0 || saving} onClick={() => go(i - 1)}><ArrowLeft size={15} /> Back</button>
        <span className="mr-auto pl-1 text-[0.84rem] text-muted">{saving ? "Saving…" : `${done} of ${questions.length} answered · saved as you go`}</span>
        {!last ? (
          <button className="btn btn-primary" disabled={saving} onClick={() => go(i + 1)}>
            {draft[q]?.trim() ? "Next" : "Skip"} <ArrowRight size={15} />
          </button>
        ) : (
          <>
            <button className="btn btn-ghost" disabled={saving} onClick={close}>Save &amp; close</button>
            <button className="btn btn-primary" disabled={saving || !done} onClick={async () => { await save(); await onRescore(); }}>
              <RotateCcw size={15} /> Save &amp; re-score
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
