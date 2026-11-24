"use client";

import { Meter } from "@/components/ui";

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
  Square,
  Target,
  XCircle,
} from "lucide-react";
import type { Application } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { createClient } from "@/lib/supabase/client";
import { Modal, Spinner, Working, useAsk } from "@/components/client-ui";
import { useGenerate } from "@/components/useGenerate";
import { useVoice } from "@/components/useVoice";

const MATCH = {
  strong: { icon: CheckCircle2, cls: "bg-good-soft text-good", label: "Proven" },
  partial: { icon: CircleDashed, cls: "bg-mustard-soft text-mustard-ink", label: "Partly" },
  missing: { icon: XCircle, cls: "bg-bad-soft text-bad", label: "Missing" },
};
const GAP = {
  lacking: { label: "Missing", cls: "bg-bad-soft text-bad", icon: XCircle, hint: "You don't have this yet - handle it honestly." },
  not_shown: { label: "Not on resume", cls: "bg-mustard-soft text-mustard-ink", icon: EyeOff, hint: "You likely have it - your resume doesn't show it." },
  unsure: { label: "Needs your answer", cls: "bg-ocean-soft text-ocean", icon: CircleHelp, hint: "Answer the question so the score is accurate." },
};

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
        role: app.role && app.role !== "Analysing..." ? app.role : res.role,
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

  if (busy && !a) return <Working steps={["Reading the job description...", "Finding what they really want...", "Comparing it with your resume...", "Scoring your fit..."]} />;
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
  // Older analyses had no per-gap question: link "unsure" gaps to the questions in order.
  const legacy = !a.gaps.some((g) => g.question !== undefined);
  const gapQuestion = (g: Analysis["gaps"][number]): string | null => {
    if (!legacy) return g.question?.trim() || null;
    if (g.status !== "unsure") return null;
    const n = a.gaps.filter((x) => x.status === "unsure").indexOf(g);
    return a.questions[n]?.trim() || null;
  };
  const answered = questions.filter((q) => answers[q]?.trim()).length;
  const scored = a.scored_with ?? {};
  const changedSinceScore = questions.some((q) => (answers[q]?.trim() ?? "") !== (scored[q]?.trim() ?? ""));
  const detailed = a.top_skills.some((s) => s.evidence !== undefined);
  const missingKw = new Set(a.keywords_missing ?? []);

  async function refresh() {
    const ok = await confirm({ title: "Refresh the analysis?", body: "Runs the recruiter analysis again with your latest resume and answers. Uses AI credit.", confirm: "Refresh" });
    if (ok !== null) analyse();
  }

  const counts = { strong: 0, partial: 0, missing: 0 };
  for (const sk of a.top_skills) counts[sk.match]++;
  const kwTotal = a.ats_keywords.length;
  const kwHave = a.keywords_missing ? kwTotal - a.ats_keywords.filter((k) => missingKw.has(k)).length : kwTotal;
  const pct = questions.length ? Math.round((answered / questions.length) * 100) : 0;

  return (
    <div className="space-y-5">
      {dialog}
      {busy && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-brand-soft px-4 py-3 text-[0.92rem] font-medium text-brand fade-up">
          <Spinner size={15} /> Re-scoring with your latest answers...
        </div>
      )}

      <div className={`space-y-5 stagger transition ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {/* Row 1: the read + coverage charts */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <section className="card flex flex-col border-l-4 border-l-brand p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-brand">What they&apos;re really hiring for</span>
              <span className="chip max-w-full whitespace-normal bg-brand-soft text-brand-ink">{a.fit_verdict}</span>
            </div>
            <p className="mt-3 font-display text-[1.2rem] font-semibold leading-snug sm:text-[1.45rem]">&ldquo;{a.real_problem}&rdquo;</p>
            <div className="mt-auto pt-5">
              <div className="border-t border-mustard pt-4">
                <div className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-mustard-ink">Why this score</div>
                <MoreText text={a.fit_reasoning} className="mt-1.5 text-[0.94rem] leading-relaxed text-ink/80" />
              </div>
            </div>
          </section>

          <section className="card grid gap-5 p-6 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {/* Skills coverage */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-muted">Skills covered</span>
                {!detailed && <button className="pill-nav h-8 px-3 text-[0.8rem]" onClick={refresh}>Get details</button>}
              </div>
              <div className="mt-2 font-display text-[2.4rem] font-bold leading-none tabular-nums">{counts.strong}<span className="text-[1rem] text-muted"> / {a.top_skills.length} proven</span></div>
              <div className="mt-3 flex h-3 gap-1 overflow-hidden rounded-full">
                {counts.strong > 0 && <span className="rounded-full bg-good" style={{ flex: counts.strong }} />}
                {counts.partial > 0 && <span className="rounded-full bg-mustard" style={{ flex: counts.partial }} />}
                {counts.missing > 0 && <span className="rounded-full bg-bad" style={{ flex: counts.missing }} />}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[0.78rem] text-muted">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-good" />{counts.strong} proven</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-mustard" />{counts.partial} partly</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-bad" />{counts.missing} missing</span>
              </div>
            </div>
            {/* ATS keyword coverage */}
            <div>
              <span className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-muted">ATS keywords</span>
              <div className="mt-2 flex items-center gap-4">
                <Ring value={kwTotal ? kwHave / kwTotal : 0} label={`${kwHave}/${kwTotal}`} />
                <p className="text-[0.86rem] leading-snug text-muted">{a.keywords_missing ? (kwTotal - kwHave ? `${kwHave} of ${kwTotal} on your resume.` : "All on your resume.") : "Words screening software looks for."}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.ats_keywords.map((k) => {
                  const miss = !!a.keywords_missing && missingKw.has(k);
                  return (
                    <span key={k} data-tip={miss ? "Not on your resume yet" : "On your resume"} className={`rounded-full px-2.5 py-0.5 text-[0.78rem] ${miss ? "border-[1.5px] border-dashed border-bad/40 text-bad" : "bg-brand-soft text-brand"}`}>{k}</span>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Row 2: unwritten expectations */}
        {a.unwritten_expectations.length > 0 && (
          <section className="grid gap-3 md:grid-cols-3">
            {a.unwritten_expectations.map((x, i) => (
              <div key={x} className="card flex gap-3 p-4">
                <span data-tone={[0, 1, 2][i % 3]} className="tone-chip grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-line-2"><Lightbulb size={16} /></span>
                <div>
                  <div className="text-[0.76rem] font-semibold uppercase tracking-[0.12em] text-muted">Expected, not written</div>
                  <p className="mt-1 text-[0.92rem] font-medium leading-snug text-ink">{x}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Row 3: what they want | answers + gaps */}
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <section className="card overflow-hidden">
            <header className="flex items-center gap-2.5 px-5 pb-3 pt-5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-soft text-brand"><Target size={15} /></span>
              <h3 className="flex-1 text-[1.25rem] font-bold">What they want</h3>
              <span className="text-[0.78rem] text-muted">Most stressed first</span>
            </header>
            <div className="divide-y divide-line border-t border-line">
              {a.top_skills.map((sk, i) => {
                const m = MATCH[sk.match];
                const isOpen = open === i;
                return (
                  <div key={sk.skill}>
                    <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className={`flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-line-2/60 ${isOpen ? "bg-line-2/50" : ""}`}>
                      <span className={`h-9 w-1.5 shrink-0 rounded-full ${sk.match === "strong" ? "bg-good" : sk.match === "partial" ? "bg-mustard" : "bg-bad"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold leading-snug">{sk.skill}</div>
                        <div className="line-clamp-1 text-[0.82rem] text-muted">{sk.why}</div>
                      </div>
                      <span className={`chip shrink-0 ${m.cls}`}><m.icon size={12} /> {m.label}</span>
                      <ChevronDown size={16} className={`shrink-0 text-faint transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="space-y-2.5 bg-line-2/50 px-5 pb-4 pl-[2.6rem] fade-up">
                        {sk.evidence === undefined ? (
                          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-3.5">
                            <p className="flex-1 text-[0.88rem] text-muted">Analysed before these details existed.</p>
                            <button className="btn btn-primary btn-sm" onClick={refresh}><RotateCcw size={13} /> Refresh</button>
                          </div>
                        ) : (
                          <>
                            <p className="flex gap-2 rounded-2xl bg-card p-3.5 text-[0.9rem] leading-relaxed">
                              <MessageSquareQuote size={15} className="mt-0.5 shrink-0 text-brand" />
                              <span>{sk.evidence ? <>&ldquo;{sk.evidence}&rdquo;</> : <span className="text-muted">Nothing on your resume shows this yet.</span>}</span>
                            </p>
                            {sk.match !== "strong" && (sk.gap_note || sk.how_to_show) && (
                              <div className="rounded-2xl bg-card p-3.5 text-[0.9rem] leading-relaxed">
                                {sk.gap_note && <p><b className="font-semibold">Missing:</b> {sk.gap_note}</p>}
                                {sk.how_to_show && <p className="mt-1.5"><b className="font-semibold">Show it:</b> {sk.how_to_show}</p>}
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
            </div>
          </section>

          <div className="flex flex-col">
            {/* Answers & re-score */}
            {questions.length > 0 && (
              <section className="dark-card flex flex-1 flex-col p-5">
                <div className="flex items-center gap-4">
                  <Ring value={pct / 100} label={`${answered}/${questions.length}`} dark />
                  <div className="min-w-0 flex-1">
                    <div className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-white/70">Recruiter&apos;s questions</div>
                    <div className="font-display text-[1.15rem] font-bold leading-snug">
                      {answered === questions.length ? "All answered" : `${questions.length - answered} still open`}
                    </div>
                    <div className="text-[0.8rem] text-white/60">{!answered ? "Answer one to re-score." : changedSinceScore ? "Score doesn't include your latest answers." : "Score is up to date."}</div>
                  </div>
                </div>
                {questions.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    {questions.map((q, i) => {
                      const ans = answers[q]?.trim();
                      return (
                        <button key={q} onClick={() => onAsk(i)} className="flex w-full items-center gap-2.5 rounded-xl bg-white/[.07] px-3 py-2.5 text-left text-[0.88rem] transition hover:bg-white/[.12]">
                          {ans ? <Check size={14} className="shrink-0 text-brand-2" /> : <CircleHelp size={14} className="shrink-0 text-mustard" />}
                          <span className="line-clamp-2 flex-1">{q}</span>
                          <span className="pill-glass h-7 shrink-0 px-3 text-[0.78rem]">{ans ? "Edit" : "Answer"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {answered < questions.length && (
                    <button className="btn btn-clay h-10" onClick={() => onAsk(Math.max(0, questions.findIndex((q) => !answers[q]?.trim())))}>
                      {answered ? `Answer ${questions.length - answered} left` : "Answer questions"} <ArrowRight size={15} />
                    </button>
                  )}
                  <button className="pill-glass h-10 disabled:cursor-not-allowed disabled:opacity-50" data-tip={!answered ? "Answer a question first" : !changedSinceScore ? "Score is up to date" : "Score again with your answers"} disabled={busy || !answered || !changedSinceScore} onClick={analyse}>
                    {busy ? <Spinner /> : <RotateCcw size={15} />} Re-score
                  </button>
                </div>
                {error && <p className="mt-2 text-[0.86rem] text-clay-2">{error}</p>}
              </section>
            )}

          </div>
        </div>
            {/* Gaps */}
        {a.gaps.length > 0 && (
          <section>
            <div className="mb-3 flex items-end justify-between">
              <h3 className="text-[1.25rem] font-bold leading-none">Gaps to close</h3>
              <span className="text-[0.78rem] text-muted">{a.gaps.length} found</span>
            </div>
            <div className={`grid gap-4 md:grid-cols-2 ${a.gaps.length % 3 === 0 || a.gaps.length === 5 ? "xl:grid-cols-3" : ""}`}>
            {a.gaps.map((g) => {
              const m = GAP[g.status];
              const gq = gapQuestion(g);
              const qi = gq ? questions.indexOf(gq) : -1;
              const ans = gq ? answers[gq]?.trim() : "";
              return (
                <div key={g.gap} className="card flex flex-col p-5">
                  <div className="flex flex-1 items-start gap-3">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.cls}`}><m.icon size={15} /></span>
                    <div className="flex min-w-0 flex-1 flex-col self-stretch">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="font-display text-[1.02rem] font-bold leading-snug">{g.gap}</span>
                        <span className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-muted">{m.label}</span>
                      </div>
                      {g.how_to_close ? (
                        <p className="mt-1 line-clamp-2 text-[0.88rem] leading-relaxed text-muted" data-tip={`${g.explanation}\n\n${g.how_to_close}`}>{g.how_to_close}</p>
                      ) : (
                        <p className="mt-1 line-clamp-2 text-[0.88rem] text-muted" data-tip={g.explanation}>{g.explanation}</p>
                      )}
                      <div className="mt-auto flex flex-wrap gap-2 pt-3">
                        {qi >= 0 && (
                          <button onClick={() => onAsk(qi)} className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8rem] font-semibold transition ${ans ? "bg-good-soft text-good" : "bg-ocean-soft text-ocean hover:brightness-95"}`}>
                            {ans ? <><CheckCircle2 size={13} /> Answered · edit</> : <><CircleHelp size={13} /> Answer the question</>}
                          </button>
                        )}
                        {g.status === "not_shown" && <button className="btn btn-ghost btn-sm" onClick={() => onGo("resume")}><FileText size={13} /> Fix in resume</button>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </section>
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

function Ring({ value, label, dark }: { value: number; label: string; dark?: boolean }) {
  return (
    <div className="w-[96px] shrink-0">
      <div className={`font-display text-[1.6rem] font-bold leading-none tabular-nums ${dark ? "text-white" : ""}`}>{label}</div>
      <Meter value={value} color={dark ? "var(--hero-accent)" : "var(--brand)"} track={dark ? "rgba(255,255,255,.18)" : "var(--line)"} className="mt-2" />
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
  const gap = gaps.find((g) => g.question?.trim() === q) ?? (gaps.some((g) => g.question !== undefined) ? undefined : gaps.filter((g) => g.status === "unsure")[i]);
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
      <p className="mt-1 text-[0.88rem] text-muted">What you did, how many, what changed. Only what&apos;s true.</p>

      <div className="relative mt-4">
        <textarea
          key={q}
          autoFocus
          className="field min-h-[200px] pb-12 text-[1rem] leading-relaxed [field-sizing:content]"
          placeholder="e.g. Yes - I set up how we chose new partners, onboarded about 40 in three months and trained them on our quality checklist. Complaints dropped from 12% to 5%."
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
        <span className="mr-auto pl-1 text-[0.84rem] text-muted">{saving ? "Saving..." : `${done} of ${questions.length} answered · saved as you go`}</span>
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

/** Long AI text: first two lines, with a toggle for the rest. */
function MoreText({ text, className = "" }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 160;
  return (
    <div className={className}>
      <p className={open || !long ? "" : "line-clamp-2"}>{text}</p>
      {long && <button type="button" onClick={() => setOpen(!open)} className="pill-nav mt-2 h-8 px-3 text-[0.82rem]">{open ? "Show less" : "Read more"}</button>}
    </div>
  );
}
