"use client";

import { Meter } from "@/components/ui";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertCircle, Check, Download, FileText, Info, Pencil, RotateCcw, ShieldCheck, Sparkles, X, TrendingUp } from "lucide-react";
import type { Application } from "@/lib/types";
import type { ResumeResult } from "@/lib/tasks";
import { createClient } from "@/lib/supabase/client";
import { CopyButton, Spinner, Working, useAsk } from "@/components/client-ui";
import { useGenerate } from "@/components/useGenerate";
import { DocEditor } from "@/components/DocEditor";

export function ResumeTab({ app, onUpdate }: { app: Application; onUpdate: (p: Partial<Application>) => void }) {
  const r = app.resume_result as ResumeResult | null;
  const md = app.tailored_resume ?? r?.resume_markdown ?? "";
  const { run, busy, error } = useGenerate<ResumeResult>("resume", app.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(md);
  const [nums, setNums] = useState<Record<string, string>>({});
  const [numErr, setNumErr] = useState(false);
  const [verified, setVerified] = useState<Record<string, boolean>>(r?.verified ?? {});
  const paper = useRef<HTMLDivElement>(null);
  const [ask, dialog] = useAsk();

  async function generate(extra?: Record<string, string>) {
    const res = await run(extra);
    if (res) {
      onUpdate({ resume_result: res, tailored_resume: res.resume_markdown });
      setDraft(res.resume_markdown);
      setNums({});
      setVerified({});
    }
  }

  async function saveEdit() {
    await createClient().from("applications").update({ tailored_resume: draft }).eq("id", app.id);
    onUpdate({ tailored_resume: draft });
    setEditing(false);
  }

  function download() {
    const w = window.open("", "_blank");
    if (!w || !paper.current) return;
    w.document.write(`<html><head><title>${app.company} - Resume</title><style>
      body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;line-height:1.45;color:#111;max-width:7.4in;margin:.45in auto}
      h1{font-size:18pt;margin:0 0 2pt}h2{font-size:9pt;letter-spacing:.12em;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:2pt;margin:12pt 0 5pt}
      h3{font-size:10.5pt;margin:6pt 0 1pt}p{margin:2pt 0}ul{margin:2pt 0;padding-left:14pt}li{margin:1.5pt 0}
      @page{margin:.4in}</style></head><body>${paper.current.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 200);
  }

  if (busy && !md) return <Working steps={["Reading what this role values...", "Reordering your experience...", "Rewriting bullets with real results...", "Checking it stays one page and ATS-safe..."]} />;

  if (!md)
    return (
      <div className="card grid items-center gap-8 overflow-hidden p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_240px] fade-up">
        <div>
          <span className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-brand">Step 3 · Resume</span>
          <h3 className="mt-2 text-[2rem] font-bold leading-tight">A resume made for this job<span className="text-clay">.</span></h3>
          <p className="mt-2 max-w-md text-muted">Rebuilt around what they want. Only what&apos;s true.</p>
          <button className="btn btn-clay mt-6 h-11" onClick={() => generate()}><Sparkles size={16} /> Create resume</button>
          {error && <p className="mt-3 flex items-center gap-1.5 text-sm text-bad"><AlertCircle size={14} /> {error}</p>}
        </div>
        <ul className="space-y-3">
          {[
            ["01", "Reordered around their top skills", "0"],
            ["02", "Bullets rewritten with real results", "1"],
            ["03", "Their ATS keywords, where true", "3"],
            ["04", "You check every change", "2"],
          ].map(([n, t, c]) => (
            <li key={n} className="flex items-center gap-3">
              <span data-tone={c} className="tone-chip grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-line-2 font-display text-[0.85rem] font-bold">{n}</span>
              <span className="font-medium">{t}</span>
            </li>
          ))}
        </ul>
        <div className="hidden rotate-2 rounded-2xl border border-line bg-white p-5 shadow-[0_24px_50px_-30px_color-mix(in_srgb,var(--side)_50%,transparent)] md:block">
          <div className="h-3 w-2/3 rounded bg-ink/80" />
          <div className="mt-2 h-2 w-1/2 rounded bg-line" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="mt-4 space-y-1.5"><div className="h-2 w-1/3 rounded bg-brand/60" /><div className="h-1.5 rounded bg-line" /><div className="h-1.5 w-5/6 rounded bg-line" /><div className="h-1.5 w-4/6 rounded bg-line" /></div>
          ))}
        </div>
      </div>
    );

  const missing = r?.missing_numbers ?? [];
  const filled = Object.values(nums).some((v) => v.trim());
  const changes = r?.changes ?? [];
  const checked = changes.filter((_, i) => verified[i] !== undefined).length;
  const untrue = changes.filter((_, i) => verified[i] === false);
  const used = r?.used_answers;
  const answersNow = Object.fromEntries(Object.entries(app.fit_answers ?? {}).filter(([, v]) => v?.trim()));
  const newAnswers = !!used && Object.entries(answersNow).some(([q, v]) => (used[q] ?? "").trim() !== v.trim());

  async function mark(i: number, ok: boolean) {
    const next: Record<string, boolean> = { ...verified, [i]: ok };
    if (verified[i] === ok) delete next[i];
    setVerified(next);
    if (r) {
      const updated = { ...r, verified: next };
      await createClient().from("applications").update({ resume_result: updated }).eq("id", app.id);
      onUpdate({ resume_result: updated });
    }
  }

  const regen = async () => { if ((await ask({ title: "Regenerate resume?", body: "A fresh version replaces the current one, including any edits you made. Uses AI credit.", confirm: "Regenerate" })) !== null) generate(); };
  const truthPct = changes.length ? checked / changes.length : 0;

  return (
    <div className="space-y-5">
      {dialog}
      {newAnswers && !busy && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-ocean-soft px-4 py-3 fade-up">
          <Info size={16} className="shrink-0 text-ocean" />
          <span className="flex-1 text-[0.92rem] text-ocean">You&apos;ve answered new questions since this resume was made.</span>
          <button className="btn btn-primary btn-sm" onClick={async () => { if ((await ask({ title: "Regenerate resume?", body: "A fresh version uses your latest answers and replaces the current one, including any edits you made. Uses AI credit.", confirm: "Regenerate" })) !== null) generate(); }}>
            <RotateCcw size={13} /> Regenerate
          </button>
        </div>
      )}

      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* The resume: stretches to the side card's height so both end on the same line */}
        <div className="flex min-w-0 flex-col">
          {editing ? (
            <div className="paper flex-1"><DocEditor mode="md" value={draft} onChange={setDraft} className="text-slate-800" /></div>
          ) : (
            <div className={`paper flex-1 transition ${busy ? "opacity-50" : ""}`} ref={paper}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
            </div>
          )}
          {error && <p className="mt-2 text-sm text-bad">{error}</p>}
        </div>

        {/* Rail: one card, sections like the scorecard. Scrolls as a whole beside the resume. */}
        <aside className="min-w-0">
          <div className="card h-full">
            <div className="xl:sticky xl:top-6">
            <section className="p-5">
              <div className="flex items-center gap-2.5">
                <span data-tone="0" className="tone-chip grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-line-2"><FileText size={16} /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[1.1rem] font-bold leading-tight">Your tailored resume</h3>
                  <p className="text-[0.8rem] text-muted">One page, ATS-safe, only what&apos;s true.</p>
                </div>
              </div>
              {editing ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button className="btn btn-primary h-11" onClick={saveEdit}><Check size={15} /> Save</button>
                  <button className="btn btn-ghost h-11" onClick={() => { setDraft(md); setEditing(false); }}>Cancel</button>
                </div>
              ) : (
                <>
                  <button className="btn btn-clay relative z-0 mt-4 h-11 w-full" onClick={download}><Download size={15} /> Download PDF</button>
                  <div className="relative z-10 mt-3 grid grid-cols-3 gap-2">
                    <CopyButton text={md} />
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><Pencil size={13} /> Edit</button>
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={regen}>{busy ? <Spinner size={13} /> : <RotateCcw size={13} />} Redo</button>
                  </div>
                </>
              )}
            </section>

            {changes.length > 0 && (
              <section className="border-t border-line p-5">
                <div className="flex items-center gap-2.5">
                  <span data-tone="2" className="tone-chip grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-line-2"><ShieldCheck size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[1.1rem] font-bold leading-tight">Check every change</h3>
                    <p className="text-[0.8rem] text-muted">You&apos;ll be asked about these in interviews.</p>
                  </div>
                  <span className="shrink-0 text-[0.84rem] font-semibold tabular-nums text-muted">{checked}/{changes.length}</span>
                </div>
                <Meter value={truthPct} color="var(--color-good)" height={6} className="mt-3" />
                <div className="mt-3 divide-y divide-line overflow-hidden rounded-2xl ring-1 ring-line">
                  {changes.map((c, i) => {
                    const v = verified[i];
                    return (
                      <div key={i} className={`px-3.5 py-3 ${v === false ? "bg-bad-soft/60" : v === true ? "bg-good-soft/40" : "bg-card"}`}>
                        <div className={`text-[0.88rem] font-medium leading-snug ${v === false ? "text-bad line-through decoration-bad/40" : ""}`} data-tip={c.why}>{c.change}</div>
                        <div className="mt-2 flex gap-1.5">
                          <button onClick={() => mark(i, true)} aria-pressed={v === true} className={`flex h-7 items-center gap-1 rounded-full px-2.5 text-[0.76rem] font-semibold transition ${v === true ? "bg-good text-white" : "bg-line-2 text-muted hover:bg-good-soft hover:text-good"}`}><Check size={12} /> True</button>
                          <button onClick={() => mark(i, false)} aria-pressed={v === false} className={`flex h-7 items-center gap-1 rounded-full px-2.5 text-[0.76rem] font-semibold transition ${v === false ? "bg-bad text-white" : "bg-line-2 text-muted hover:bg-bad-soft hover:text-bad"}`}><X size={12} /> Not true</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {untrue.length > 0 && (
                  <div className="mt-3 flex items-center gap-3 rounded-2xl bg-bad-soft px-4 py-3">
                    <span className="flex-1 text-[0.86rem] font-medium text-bad">{untrue.length} marked not true</span>
                    <button className="btn btn-clay btn-sm" disabled={busy} onClick={() => generate({ untrue: untrue.map((c) => `- ${c.change}`).join("\n") })}>{busy ? <Spinner size={13} /> : <RotateCcw size={13} />} Fix these</button>
                  </div>
                )}
              </section>
            )}

            {missing.length > 0 && (
              <section className="border-t border-line p-5">
                <div className="flex items-center gap-2.5">
                  <span data-tone="3" className="tone-chip grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-line-2"><TrendingUp size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[1.1rem] font-bold leading-tight">Add real numbers</h3>
                    <p className="text-[0.8rem] text-muted">Numbers make bullets stronger. Skip any you don&apos;t know.</p>
                  </div>
                </div>
                <div className="mt-3 space-y-3">
                  {missing.map((q) => (
                    <div key={q}>
                      <label className="label">{q}</label>
                      <input className="field" value={nums[q] ?? ""} onChange={(e) => setNums({ ...nums, [q]: e.target.value })} placeholder="e.g. 40% or ₹12 lakh" />
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-primary mt-4 h-11 w-full"
                  disabled={busy}
                  onClick={() => (filled ? generate({ numbers: Object.entries(nums).filter(([, v]) => v.trim()).map(([q, v]) => `${q} → ${v}`).join("\n") }) : setNumErr(true))}
                >
                  {busy ? <Spinner /> : <Sparkles size={15} />} Update resume
                </button>
                {numErr && !filled && <p className="mt-2 text-[0.82rem] font-medium text-bad">Add at least one number first.</p>}
              </section>
            )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
