"use client";

import { Meter } from "./ui";

import { useMemo, useState } from "react";
import { ArrowRight, Check, HeartPulse, ShieldCheck, Sparkles, TrendingUp, Wrench, X } from "lucide-react";
import { checkBullet, resumeHealth, type BulletReport } from "@/lib/resume-health";
import { Modal } from "./client-ui";

const GRADE = {
  strong: { label: "Strong - recruiter ready", cls: "text-good" },
  good: { label: "Good - a few fixes to go", cls: "text-brand-ink" },
  fair: { label: "Fair - fix the bullets below", cls: "text-mid" },
  weak: { label: "Needs work", cls: "text-bad" },
};

/** Live resume health check (Prompt 3 rules) with one-at-a-time bullet fixes. */
export function ResumeHealth({ value, onChange, savedValue, start, compact }: { value: string; onChange: (v: string) => void; savedValue: string; start: number | null; compact?: boolean }) {
  const report = useMemo(() => resumeHealth(value), [value]);
  const savedScore = useMemo(() => resumeHealth(savedValue).score, [savedValue]);
  const [fixing, setFixing] = useState<BulletReport | null>(null);
  const [showAll, setShowAll] = useState(false);
  if (!value.trim()) return null;

  const weak = report.bullets.filter((b) => b.score < 8).sort((a, b) => a.score - b.score);
  const list = showAll ? report.bullets : weak;
  const g = GRADE[report.grade];
  const base = start ?? savedScore;
  const delta = report.score - base;
  const unsaved = report.score - savedScore;

  function apply(text: string) {
    if (!fixing) return;
    const lines = value.split("\n");
    const prefix = lines[fixing.line].match(/^\s*[-•*]\s+/)?.[0] ?? "- ";
    lines[fixing.line] = prefix + text.trim();
    onChange(lines.join("\n"));
    setFixing(null);
  }

  return (
    <section className={`card overflow-hidden fade-up ${compact ? "" : "mb-5"}`}>
      <div className={`grid gap-6 p-5 sm:p-6 ${compact ? "" : "lg:grid-cols-[260px_minmax(0,1fr)]"}`}>
        {/* Score */}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span data-tone="2" className="tone-chip grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-line-2"><HeartPulse size={16} /></span>
            <h2 className="flex-1 text-[1.15rem] font-bold leading-tight">Resume health</h2>
          </div>
          <div className="mt-4"><ScoreRing score={report.score} /></div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className={`text-[0.92rem] font-semibold ${g.cls}`}>{g.label}</span>
            {delta !== 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-good-soft px-2.5 py-0.5 text-[0.78rem] font-semibold text-good" data-tip="Since your first check">
                <TrendingUp size={12} /> {base} → {report.score}
              </span>
            )}
          </div>
          {unsaved !== 0 && <div className="mt-1.5 text-[0.78rem] text-muted">{unsaved > 0 ? `+${unsaved}` : unsaved} from unsaved edits - save to keep</div>}
        </div>

        {/* ATS-safe checks */}
        <div className={`min-w-0 ${compact ? "border-t border-line pt-5" : ""}`}>
          <div className="flex items-center gap-2.5">
            <span data-tone="0" className="tone-chip grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-line-2"><ShieldCheck size={16} /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[1.15rem] font-bold leading-tight">ATS-safe checks</h2>
              <div className="text-[0.82rem] text-muted">What recruiters and ATS check first.</div>
            </div>
            <span className={`chip shrink-0 ${report.doc.every((d) => d.ok) ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{report.doc.filter((d) => d.ok).length}/{report.doc.length}</span>
          </div>
          <ul className={`mt-3 divide-y divide-line ${compact ? "" : "sm:grid sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0 xl:grid-cols-3"}`}>
            {report.doc.map((d) => (
              <li key={d.label} className="flex items-start gap-2.5 py-2.5 text-[0.9rem]">
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${d.ok ? "bg-good text-white" : "bg-bad text-white"}`}>{d.ok ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}</span>
                <span className="font-medium">
                  {d.label}
                  {!d.ok && <span className="block text-[0.8rem] font-normal text-muted">{d.tip}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bullets */}
      <div className="border-t border-line">
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
          <div>
            <div className="font-display text-[1.15rem] font-bold">{showAll ? `All bullets (${report.bullets.length})` : weak.length ? `${weak.length} bullet${weak.length > 1 ? "s" : ""} to strengthen` : "Every bullet looks strong"}</div>
            <div className="text-[0.8rem] text-muted">Scored out of 10 on numbers, verbs and length.</div>
          </div>
          {report.bullets.length > 0 && <button className="pill-nav h-8 px-3 text-[0.82rem]" onClick={() => setShowAll(!showAll)}>{showAll ? "Show only weak ones" : `Show all ${report.bullets.length}`}</button>}
        </div>
        <div className={`grid gap-px bg-line ${compact ? "" : "lg:grid-cols-2"}`}>
          {list.map((b) => (
            <div key={b.line} className="flex items-start gap-3 bg-card px-6 py-3.5">
              <span className={`mt-0.5 grid h-8 w-10 shrink-0 place-items-center rounded-full font-display text-[0.9rem] font-bold tabular-nums ${b.score >= 8 ? "bg-good-soft text-good" : b.score >= 6 ? "bg-brand-soft text-brand" : "bg-bad-soft text-bad"}`}>{b.score}</span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[0.92rem] leading-snug text-ink">{b.text}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {b.checks.filter((c) => !c.ok).map((c) => <span key={c.key} className="chip bg-bad-soft py-0 text-[0.78rem] text-bad">{c.fail}</span>)}
                  {b.score >= 8 && <span className="chip bg-good-soft py-0 text-[0.78rem] text-good"><Check size={10} /> Strong</span>}
                </div>
              </div>
              {b.score < 10 && <button className="btn btn-ghost btn-sm shrink-0" onClick={() => setFixing(b)}><Wrench size={13} /> Fix</button>}
            </div>
          ))}
        </div>
      </div>

      {fixing && <FixBullet bullet={fixing} onClose={() => setFixing(null)} onApply={apply} />}
    </section>
  );
}

function FixBullet({ bullet, onClose, onApply }: { bullet: BulletReport; onClose: () => void; onApply: (t: string) => void }) {
  const [t, setT] = useState(bullet.text);
  const live = checkBullet(t, bullet.line);
  return (
    <Modal open onClose={onClose} title="Strengthen this bullet" width={640}>
      <p className="mb-3 text-[0.9rem] text-muted">Only add what&apos;s true - you&apos;ll be asked about it in interviews. Use the format: <b className="font-semibold text-ink">action verb + what you did + measurable result</b>.</p>
      <textarea autoFocus className="field min-h-[110px] text-[1rem] leading-relaxed [field-sizing:content]" value={t} onChange={(e) => setT(e.target.value)} />
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className={`mr-1 grid h-7 w-9 place-items-center rounded-lg text-[0.85rem] font-bold tabular-nums ${live.score >= 8 ? "bg-good-soft text-good" : live.score >= 6 ? "bg-mid-soft text-mid" : "bg-bad-soft text-bad"}`}>{live.score}</span>
        {live.checks.map((c) => (
          <span key={c.key} className={`chip py-0.5 text-[0.78rem] ${c.ok ? "bg-good-soft text-good" : "bg-line-2 text-muted"}`}>{c.ok ? <Check size={11} /> : <X size={11} />} {c.label}</span>
        ))}
      </div>
      {live.tip && <p className="mt-3 flex items-start gap-2 rounded-xl bg-brand-soft px-3.5 py-2.5 text-[0.9rem] text-brand-ink"><Sparkles size={14} className="mt-0.5 shrink-0" /> {live.tip}</p>}
      <div className="mt-5 flex items-center justify-end gap-2 border-t border-line pt-4">
        <span className="mr-auto text-[0.84rem] text-muted">{bullet.score} → <b className="text-ink">{live.score}</b></span>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!t.trim() || t.trim() === bullet.text} onClick={() => onApply(t)}>Apply to resume <ArrowRight size={15} /></button>
      </div>
    </Modal>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 85 ? "var(--color-good)" : score >= 70 ? "var(--brand)" : "var(--color-bad)";
  return (
    <div className="w-full max-w-[220px]">
      <div className="font-display text-[2.4rem] font-bold leading-none tabular-nums">{score}<span className="text-[1rem] text-muted">/100</span></div>
      <Meter value={score / 100} color={color} className="mt-2.5" height={8} />
    </div>
  );
}
