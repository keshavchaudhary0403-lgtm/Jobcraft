"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertCircle, Check, Download, FileText, Hash, Info, ListChecks, Pencil, RotateCcw, Sparkles, X } from "lucide-react";
import type { Application } from "@/lib/types";
import type { ResumeResult } from "@/lib/tasks";
import { createClient } from "@/lib/supabase/client";
import { CopyButton, Spinner, Working, useAsk } from "@/components/client-ui";
import { Panel } from "@/components/ui";
import { useGenerate } from "@/components/useGenerate";
import { DocEditor } from "@/components/DocEditor";

export function ResumeTab({ app, onUpdate }: { app: Application; onUpdate: (p: Partial<Application>) => void }) {
  const r = app.resume_result as ResumeResult | null;
  const md = app.tailored_resume ?? r?.resume_markdown ?? "";
  const { run, busy, error } = useGenerate<ResumeResult>("resume", app.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(md);
  const [nums, setNums] = useState<Record<string, string>>({});
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

  if (busy && !md) return <Working steps={["Reading what this role values…", "Reordering your experience…", "Rewriting bullets with real results…", "Checking it stays one page and ATS-safe…"]} />;

  if (!md)
    return (
      <div className="card ai-gradient flex flex-col items-center px-6 py-14 text-center fade-up">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-ink text-on-brand shadow-lg"><FileText size={22} /></div>
        <div className="mt-4 text-lg font-medium">A resume made for this job</div>
        <p className="mt-1 max-w-sm text-sm text-muted">Reordered and reworded around what they want — using only what&apos;s true.</p>
        <button className="btn btn-brand mt-5" onClick={() => generate()}><Sparkles size={16} /> Create resume</button>
        {error && <p className="mt-3 flex items-center gap-1.5 text-sm text-bad"><AlertCircle size={14} /> {error}</p>}
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

  return (
    <div className="flex flex-col gap-4">
      {dialog}
      {newAnswers && !busy && (
        <div className="order-0 flex flex-wrap items-center gap-3 rounded-xl border border-brand/20 bg-brand-soft px-4 py-3 fade-up">
          <Info size={16} className="shrink-0 text-brand" />
          <span className="flex-1 text-[0.92rem] text-brand-ink">You&apos;ve answered new questions since this resume was made. Regenerate to include them.</span>
          <button
            className="btn btn-primary btn-sm"
            onClick={async () => { if ((await ask({ title: "Regenerate resume?", body: "A fresh version uses your latest answers and replaces the current one, including any edits you made. Uses AI credit.", confirm: "Regenerate" })) !== null) generate(); }}
          >
            <RotateCcw size={13} /> Regenerate
          </button>
        </div>
      )}
      <div className="order-2 fade-up">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <button className="btn btn-primary btn-sm" onClick={saveEdit}><Check size={14} /> Save</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setDraft(md); setEditing(false); }}>Cancel</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary btn-sm" onClick={download}><Download size={14} /> Download PDF</button>
              <CopyButton text={md} />
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</button>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={async () => { if ((await ask({ title: "Regenerate resume?", body: "A fresh version replaces the current one, including any edits you made. Uses AI credit.", confirm: "Regenerate" })) !== null) generate(); }}>
                {busy ? <Spinner size={14} /> : <RotateCcw size={14} />} Regenerate
              </button>
            </>
          )}
        </div>
        {editing ? (
          <div className="paper"><DocEditor mode="md" value={draft} onChange={setDraft} className="text-slate-800" /></div>
        ) : (
          <div className={`paper transition ${busy ? "opacity-50" : ""}`} ref={paper}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-bad">{error}</p>}
      </div>

      <aside className="order-1 grid items-start gap-4 stagger empty:hidden">
        {missing.length > 0 && (
          <Panel title="The recruiter needs numbers" sub="Real numbers make bullets credible. Skip any you do not know." icon={<Hash size={15} />}>
            <div className="grid gap-3.5 md:grid-cols-2">
              {missing.map((q) => (
                <div key={q}>
                  <label className="mb-1.5 block font-medium text-slate-800">{q}</label>
                  <input className="field" value={nums[q] ?? ""} onChange={(e) => setNums({ ...nums, [q]: e.target.value })} placeholder="Skip if you don't know" />
                </div>
              ))}
            </div>
            <button
              className="btn btn-brand mt-4"
              disabled={!filled || busy}
              onClick={() =>
                generate({
                  numbers: Object.entries(nums)
                    .filter(([, v]) => v.trim())
                    .map(([q, v]) => `${q} → ${v}`)
                    .join("\n"),
                })
              }
            >
              {busy ? <Spinner /> : <Sparkles size={15} />} Update resume
            </button>
          </Panel>
        )}
        {changes.length > 0 && (
          <Panel
            title="Check every change is true"
            sub="You'll be asked about each of these in interviews."
            icon={<ListChecks size={15} />}
            action={<span className={`chip ${checked === changes.length ? "bg-good-soft text-good" : "bg-line-2 text-muted"}`}>{checked} of {changes.length} checked</span>}
            bodyClass="divide-y divide-line"
          >
            {changes.map((c, i) => {
              const v = verified[i];
              return (
                <div key={i} className={`flex items-start gap-3 px-5 py-3 transition ${v === false ? "bg-bad-soft/40" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <div className={`font-medium ${v === false ? "text-bad line-through decoration-bad/40" : "text-slate-800"}`}>{c.change}</div>
                    <div className="text-[0.85rem] text-muted">{c.why}</div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => mark(i, true)}
                      aria-pressed={v === true}
                      className={`flex h-8 items-center gap-1 rounded-full px-3 text-[0.82rem] font-semibold transition ${v === true ? "bg-good text-white" : "bg-line-2 text-muted hover:bg-good-soft hover:text-good"}`}
                    >
                      <Check size={13} /> True
                    </button>
                    <button
                      onClick={() => mark(i, false)}
                      aria-pressed={v === false}
                      className={`flex h-8 items-center gap-1 rounded-full px-3 text-[0.82rem] font-semibold transition ${v === false ? "bg-bad text-white" : "bg-line-2 text-muted hover:bg-bad-soft hover:text-bad"}`}
                    >
                      <X size={13} /> Not true
                    </button>
                  </div>
                </div>
              );
            })}
            {untrue.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 bg-bad-soft/40 px-5 py-3.5">
                <span className="flex-1 text-[0.9rem] text-slate-800">{untrue.length} change{untrue.length > 1 ? "s" : ""} marked not true — fix before you send this resume.</span>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={busy}
                  onClick={() => generate({ untrue: untrue.map((c) => `- ${c.change}`).join("\n") })}
                >
                  {busy ? <Spinner size={13} /> : <RotateCcw size={13} />} Fix these
                </button>
              </div>
            )}
          </Panel>
        )}
      </aside>
    </div>
  );
}
