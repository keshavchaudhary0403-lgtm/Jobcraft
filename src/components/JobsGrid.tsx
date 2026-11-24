"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CheckSquare, Plus, Sparkles, Trash2, X } from "lucide-react";
import type { Application } from "@/lib/types";
import { JobTile } from "./JobTiles";
import { WorkingInline, useAsk } from "./client-ui";
import { createClient } from "@/lib/supabase/client";

/**
 * Jobs grid with a Select mode: pick jobs, then analyse them with AI (one by one, credit per job)
 * or delete them. Saved jobs never run AI on their own.
 */
export function JobsGrid({ jobs, practised, addCard }: { jobs: Application[]; practised: string[]; addCard: boolean }) {
  const router = useRouter();
  const done = new Set(practised);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ i: number; n: number } | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [ask, dialog] = useAsk();

  const unanalysed = jobs.filter((a) => !a.analysis);
  const sel = jobs.filter((a) => picked.has(a.id));
  const toAnalyse = sel.filter((a) => !a.analysis);
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const stop = () => { setSelecting(false); setPicked(new Set()); };

  async function analyseSelected() {
    if (!toAnalyse.length) return;
    const ok = await ask({
      title: `Analyse ${toAnalyse.length} job${toAnalyse.length > 1 ? "s" : ""} with AI?`,
      body: `Each job uses AI credit (about the same as analysing one job on its own). Already-analysed jobs in your selection are skipped.`,
      confirm: `Analyse ${toAnalyse.length}`,
    });
    if (ok === null) return;
    setNote(null);
    let fails = 0;
    for (let i = 0; i < toAnalyse.length; i++) {
      setProgress({ i: i + 1, n: toAnalyse.length });
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task: "analysis", applicationId: toAnalyse[i].id }) }).catch(() => null);
      if (!res?.ok) {
        fails++;
        const data = await res?.json().catch(() => ({}));
        if (res && (res.status === 402 || res.status === 429)) {
          setNote({ ok: false, text: data?.error ?? "Stopped: AI limit reached." });
          break;
        }
      }
    }
    setProgress(null);
    if (!fails) setNote({ ok: true, text: `Analysed ${toAnalyse.length} job${toAnalyse.length > 1 ? "s" : ""}.` });
    else setNote((n) => n ?? { ok: false, text: `${toAnalyse.length - fails} analysed, ${fails} didn't finish - try those again.` });
    stop();
    router.refresh();
  }

  async function deleteSelected() {
    if (!sel.length) return;
    const ok = await ask({
      title: `Delete ${sel.length} job${sel.length > 1 ? "s" : ""}?`,
      body: "Their resumes, messages and practice links are removed too. This can't be undone.",
      confirm: "Delete",
      danger: true,
    });
    if (ok === null) return;
    const { error } = await createClient().from("applications").delete().in("id", sel.map((a) => a.id));
    setNote(error ? { ok: false, text: error.message } : { ok: true, text: `Deleted ${sel.length} job${sel.length > 1 ? "s" : ""}.` });
    stop();
    router.refresh();
  }

  return (
    <section className="space-y-4">
      {dialog}
      {/* Select bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        {!selecting ? (
          <>
            <button className="btn btn-soft h-10 px-4" onClick={() => setSelecting(true)} disabled={!jobs.length}><CheckSquare size={15} /> Select</button>
            {unanalysed.length > 0 && (
              <span className="text-[0.86rem] text-muted">{unanalysed.length} saved job{unanalysed.length > 1 ? "s" : ""} not analysed yet - select them to run AI.</span>
            )}
          </>
        ) : (
          <div className="flex w-full flex-wrap items-center gap-2.5 rounded-2xl bg-brand-soft px-3 py-2.5 fade-up">
            <span className="pl-1 text-[0.92rem] font-semibold text-brand-ink">{picked.size} selected</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPicked(new Set(unanalysed.map((a) => a.id)))} disabled={!unanalysed.length}>Not analysed ({unanalysed.length})</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPicked(new Set(jobs.map((a) => a.id)))}>All ({jobs.length})</button>
            <span className="ml-auto flex flex-wrap gap-2">
              <button className="btn btn-clay h-10 px-4 !shadow-none" disabled={!toAnalyse.length || !!progress} onClick={analyseSelected}><Sparkles size={15} /> Analyse {toAnalyse.length || ""}</button>
              <button className="btn btn-danger-soft h-10 px-4" disabled={!sel.length || !!progress} onClick={deleteSelected}><Trash2 size={15} /> Delete {sel.length || ""}</button>
              <button className="btn btn-ghost h-10 w-10 px-0" onClick={stop} aria-label="Cancel selecting" data-tip="Cancel"><X size={16} /></button>
            </span>
          </div>
        )}
      </div>
      {progress && <WorkingInline text={`Analysing ${progress.i} of ${progress.n}... keep this tab open`} />}
      {note && (
        <div className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 text-[0.9rem] font-medium fade-up ${note.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
          {note.ok && <Check size={15} strokeWidth={3} />} {note.text}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 stagger">
        {jobs.map((a) => (
          <div key={a.id} className="relative">
            <JobTile a={a} practised={done} />
            {selecting && (
              <button
                type="button"
                onClick={() => toggle(a.id)}
                aria-pressed={picked.has(a.id)}
                aria-label={`Select ${a.role} at ${a.company}`}
                className={`absolute inset-0 rounded-[22px] text-left transition ${picked.has(a.id) ? "bg-brand/[.06] ring-2 ring-brand" : "bg-white/0 hover:bg-brand/[.03] ring-1 ring-transparent hover:ring-brand/30"}`}
              >
                <span className={`absolute -left-2 -top-2 grid h-7 w-7 place-items-center rounded-lg border-2 shadow-sm ${picked.has(a.id) ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>
                  {picked.has(a.id) && <Check size={15} strokeWidth={3} />}
                </span>
              </button>
            )}
          </div>
        ))}
        {addCard && !selecting && (
          <Link href="/jobs/new" className="group card card-hover flex min-h-[200px] flex-col p-6">
            <span data-tone="1" className="tone-chip grid h-11 w-11 place-items-center rounded-xl bg-line-2"><Plus size={20} /></span>
            <span className="mt-4 block font-display text-[1.15rem] font-bold">Add another job</span>
            <span className="block text-[0.86rem] text-muted">Paste a link or the description.</span>
            <span className="mt-auto pt-4"><span className="pill-action">Add a job <ArrowRight size={14} /></span></span>
          </Link>
        )}
        {!jobs.length && <div className="card p-10 text-center text-muted md:col-span-2 xl:col-span-3">No jobs here.</div>}
      </div>
    </section>
  );
}
