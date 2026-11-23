"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertCircle, Check, ChevronDown, Download, FileText, Hash, Pencil, RotateCcw, Sparkles } from "lucide-react";
import type { Application } from "@/lib/types";
import type { ResumeResult } from "@/lib/tasks";
import { createClient } from "@/lib/supabase/client";
import { CopyButton, Spinner, Working } from "@/components/client-ui";
import { useGenerate } from "@/components/useGenerate";

export function ResumeTab({ app, onUpdate }: { app: Application; onUpdate: (p: Partial<Application>) => void }) {
  const r = app.resume_result as ResumeResult | null;
  const md = app.tailored_resume ?? r?.resume_markdown ?? "";
  const { run, busy, error } = useGenerate<ResumeResult>("resume", app.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(md);
  const [nums, setNums] = useState<Record<string, string>>({});
  const [showChanges, setShowChanges] = useState(false);
  const paper = useRef<HTMLDivElement>(null);

  async function generate(extra?: Record<string, string>) {
    const res = await run(extra);
    if (res) {
      onUpdate({ resume_result: res, tailored_resume: res.resume_markdown });
      setDraft(res.resume_markdown);
      setNums({});
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
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-white shadow-lg"><FileText size={22} /></div>
        <div className="mt-4 text-lg font-medium">A resume made for this job</div>
        <p className="mt-1 max-w-sm text-sm text-muted">Reordered and reworded around what they want — using only what&apos;s true.</p>
        <button className="btn btn-brand mt-5" onClick={() => generate()}><Sparkles size={16} /> Create resume</button>
        {error && <p className="mt-3 flex items-center gap-1.5 text-sm text-bad"><AlertCircle size={14} /> {error}</p>}
      </div>
    );

  const missing = r?.missing_numbers ?? [];
  const filled = Object.values(nums).some((v) => v.trim());

  return (
    <div className="flex flex-col gap-4">
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
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => generate()}>
                {busy ? <Spinner size={14} /> : <RotateCcw size={14} />} Regenerate
              </button>
            </>
          )}
        </div>
        {editing ? (
          <textarea className="field min-h-[70vh] font-mono text-xs leading-relaxed" value={draft} onChange={(e) => setDraft(e.target.value)} />
        ) : (
          <div className={`paper transition ${busy ? "opacity-50" : ""}`} ref={paper}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-bad">{error}</p>}
      </div>

      <aside className="order-1 grid gap-4 md:grid-cols-2 stagger empty:hidden">
        {missing.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center gap-2 font-medium"><Hash size={16} className="text-brand" /> Add real numbers</div>
            <p className="mt-1 text-xs text-muted">Numbers make bullets stronger. Skip any you don&apos;t know.</p>
            <div className="mt-4 space-y-3">
              {missing.map((q) => (
                <div key={q}>
                  <label className="mb-1 block text-xs text-slate-700">{q}</label>
                  <input className="field py-2 text-sm" value={nums[q] ?? ""} onChange={(e) => setNums({ ...nums, [q]: e.target.value })} />
                </div>
              ))}
            </div>
            <button
              className="btn btn-brand mt-4 w-full"
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
          </div>
        )}
        {!!r?.changes?.length && (
          <div className="card p-5">
            <button className="flex w-full items-center justify-between font-medium" onClick={() => setShowChanges(!showChanges)}>
              <span>What changed <span className="text-sm font-normal text-muted">· {r.changes.length}</span></span>
              <ChevronDown size={16} className={`text-muted transition ${showChanges ? "rotate-180" : ""}`} />
            </button>
            <p className="mt-1 text-xs text-muted">Check each one is true.</p>
            {showChanges && (
              <ul className="mt-3 space-y-3 fade-up">
                {r.changes.map((c, i) => (
                  <li key={i} className="text-sm">
                    <div className="font-medium text-slate-800">{c.change}</div>
                    <div className="text-xs text-muted">{c.why}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
