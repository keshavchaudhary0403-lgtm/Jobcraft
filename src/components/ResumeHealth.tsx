"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, HeartPulse, Sparkles, TrendingUp, Wrench, X } from "lucide-react";
import { checkBullet, resumeHealth, type BulletReport } from "@/lib/resume-health";
import { Modal } from "./client-ui";

const GRADE = {
  strong: { label: "Strong — recruiter ready", cls: "text-good" },
  good: { label: "Good — a few fixes to go", cls: "text-brand-ink" },
  fair: { label: "Fair — fix the bullets below", cls: "text-mid" },
  weak: { label: "Needs work", cls: "text-bad" },
};

/** Live resume health check (Prompt 3 rules) with one-at-a-time bullet fixes. */
export function ResumeHealth({ value, onChange, savedValue, start }: { value: string; onChange: (v: string) => void; savedValue: string; start: number | null }) {
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
    <section className="card mb-4 overflow-hidden fade-up">
      <div className="flex items-center gap-2.5 border-b border-line bg-line-2/40 px-5 py-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-brand"><HeartPulse size={15} /></span>
        <div className="min-w-0 flex-1">
          <div className="font-bold leading-tight">Resume health</div>
          <div className="text-[0.8rem] text-muted">Checked live against what recruiters and ATS look for. Free, no AI.</div>
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Score */}
        <div className="flex flex-col items-center text-center">
          <ScoreRing score={report.score} />
          <div className={`mt-2 font-semibold ${g.cls}`}>{g.label}</div>
          {delta !== 0 && (
            <div className="mt-2 flex items-center gap-1.5 rounded-full bg-good-soft px-3 py-1 text-[0.82rem] font-semibold text-good" title="Since your first check">
              <TrendingUp size={13} /> {base} → {report.score} <span className="font-normal">({delta > 0 ? "+" : ""}{delta})</span>
            </div>
          )}
          {unsaved !== 0 && <div className="mt-1.5 text-[0.78rem] text-muted">{unsaved > 0 ? `+${unsaved}` : unsaved} from unsaved edits — save to keep</div>}
        </div>

        {/* ATS-safe checks */}
        <div>
          <div className="mb-2 text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-muted">ATS-safe checks</div>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {report.doc.map((d) => (
              <div key={d.label} className="flex items-start gap-2 text-[0.9rem]" title={d.ok ? undefined : d.tip}>
                <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${d.ok ? "bg-good text-white" : "bg-bad-soft text-bad"}`}>{d.ok ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}</span>
                <span className={d.ok ? "text-slate-700" : "text-ink"}>
                  {d.label}
                  {!d.ok && <span className="block text-[0.8rem] text-muted">{d.tip}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bullets */}
      <div className="border-t border-line">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
          <div>
            <div className="font-semibold">{showAll ? `All bullets (${report.bullets.length})` : weak.length ? `${weak.length} bullet${weak.length > 1 ? "s" : ""} to strengthen` : "Every bullet looks strong"}</div>
            <div className="text-[0.8rem] text-muted">Each is scored out of 10: a number, a strong verb, length, active voice, no filler, no buzzwords.</div>
          </div>
          {report.bullets.length > 0 && <button className="pill-link" onClick={() => setShowAll(!showAll)}>{showAll ? "Show only weak ones" : `Show all ${report.bullets.length}`}</button>}
        </div>
        <div className="divide-y divide-line">
          {list.map((b) => (
            <div key={b.line} className="flex items-start gap-3 px-5 py-3">
              <span className={`mt-0.5 grid h-8 w-10 shrink-0 place-items-center rounded-lg text-[0.85rem] font-bold tabular-nums ${b.score >= 8 ? "bg-good-soft text-good" : b.score >= 6 ? "bg-mid-soft text-mid" : "bg-bad-soft text-bad"}`}>{b.score}</span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[0.92rem] leading-snug text-slate-800">{b.text}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {b.checks.filter((c) => !c.ok).map((c) => <span key={c.key} className="chip bg-bad-soft/70 py-0 text-[0.72rem] text-bad">{c.fail}</span>)}
                  {b.score >= 8 && <span className="chip bg-good-soft py-0 text-[0.72rem] text-good"><Check size={10} /> Strong</span>}
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
      <p className="mb-3 text-[0.9rem] text-muted">Only add what&apos;s true — you&apos;ll be asked about it in interviews. Use the format: <b className="font-semibold text-ink">action verb + what you did + measurable result</b>.</p>
      <textarea autoFocus className="field min-h-[110px] text-[1rem] leading-relaxed [field-sizing:content]" value={t} onChange={(e) => setT(e.target.value)} />
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className={`mr-1 grid h-7 w-9 place-items-center rounded-lg text-[0.85rem] font-bold tabular-nums ${live.score >= 8 ? "bg-good-soft text-good" : live.score >= 6 ? "bg-mid-soft text-mid" : "bg-bad-soft text-bad"}`}>{live.score}</span>
        {live.checks.map((c) => (
          <span key={c.key} className={`chip py-0.5 text-[0.75rem] ${c.ok ? "bg-good-soft text-good" : "bg-line-2 text-muted"}`}>{c.ok ? <Check size={11} /> : <X size={11} />} {c.label}</span>
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
  const r = 46;
  const c = 2 * Math.PI * r;
  const color = score >= 85 ? "var(--color-good)" : score >= 70 ? "var(--brand)" : score >= 50 ? "#d8822c" : "var(--color-bad)";
  return (
    <div className="relative grid h-[120px] w-[120px] place-items-center">
      <svg width="120" height="120" className="-rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line-2)" strokeWidth="9" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-[2rem] font-bold leading-none tracking-tight">{score}</div>
        <div className="text-[0.75rem] text-muted">of 100</div>
      </div>
    </div>
  );
}
