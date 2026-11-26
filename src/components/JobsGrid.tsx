"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronRight, ListChecks, Minus, Search, Sparkles, Trash2, X } from "lucide-react";
import { STATUSES, type Application, type Status } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { JobRowContent, STATUS_BAR } from "./JobTiles";
import { STATUS_META } from "./ui";
import { WorkingInline, useAsk } from "./client-ui";
import { createClient } from "@/lib/supabase/client";

type Filter = "" | "new" | Status;
type Sort = "recent" | "fit";

const fitOf = (a: Application) => (a.analysis as Analysis | null)?.fit_score ?? -1;

/**
 * The app's job list: compact rows (many jobs in one view) with search, status filters and sort, all instant.
 * `full` (Jobs page) adds bulk select: tap "Select", tick rows (Shift-click = range, Ctrl/Cmd+A = all, Esc = done),
 * then Analyse (AI, one by one, credit per job) or Delete from the floating bar. Saved jobs never run AI on their own.
 * `home` shows the latest few with a search across all of them.
 */
export function JobsGrid({
  jobs,
  practised,
  variant = "full",
  initialFilter = "",
  initialSort = "recent",
  limit = 5,
}: {
  jobs: Application[];
  practised: string[];
  variant?: "full" | "home";
  initialFilter?: string;
  initialSort?: string;
  limit?: number;
}) {
  const router = useRouter();
  const done = useMemo(() => new Set(practised), [practised]);
  const full = variant === "full";

  // ── Search / filter / sort ──
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>((["", "new", ...STATUSES] as string[]).includes(initialFilter) ? (initialFilter as Filter) : "");
  const [sort, setSort] = useState<Sort>(initialSort === "fit" ? "fit" : "recent");
  const q = query.trim().toLowerCase();
  const unanalysed = jobs.filter((a) => !a.analysis);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, jobs.filter((a) => a.status === s).length])) as Record<Status, number>;
  const shown = jobs
    .filter((a) => !filter || (filter === "new" ? !a.analysis : a.status === filter))
    .filter((a) => !q || `${a.role} ${a.company} ${a.location ?? ""}`.toLowerCase().includes(q))
    .sort((x, y) => (sort === "fit" ? fitOf(y) - fitOf(x) : 0));
  const visible = full || q ? shown : shown.slice(0, limit);

  // ── Select ──
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ i: number; n: number } | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [ask, dialog] = useAsk();
  const lastIndex = useRef<number | null>(null);
  const sel = jobs.filter((a) => picked.has(a.id));
  const toAnalyse = sel.filter((a) => !a.analysis);
  const allShownPicked = shown.length > 0 && shown.every((a) => picked.has(a.id));
  const someShownPicked = shown.some((a) => picked.has(a.id)) && !allShownPicked;
  const stop = () => { setSelecting(false); setPicked(new Set()); lastIndex.current = null; };

  /** Toggle one row; with Shift, set the whole range since the last click to this row's new state. */
  function pick(index: number, shift: boolean) {
    const id = shown[index].id;
    const prev = lastIndex.current; // read now - the updater below runs after lastIndex is overwritten
    setPicked((p) => {
      const n = new Set(p);
      const on = !n.has(id);
      if (shift && prev != null) {
        for (let i = Math.min(prev, index); i <= Math.max(prev, index); i++) { if (on) n.add(shown[i].id); else n.delete(shown[i].id); }
      } else if (on) n.add(id);
      else n.delete(id);
      return n;
    });
    lastIndex.current = index;
  }

  // Keyboard while selecting: Esc finishes, Ctrl/Cmd+A picks every row shown (not while typing or in a dialog).
  useEffect(() => {
    if (!selecting) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable], [data-modal]") || progress) return;
      if (e.key === "Escape") stop();
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") { e.preventDefault(); setPicked(new Set(shown.map((a) => a.id))); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selecting, shown, progress]);

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

  const chip = (on: boolean) => `flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.86rem] font-semibold transition ${on ? "bg-side text-white" : "bg-line-2 text-ink hover:bg-line"}`;

  return (
    <section className={`space-y-4 ${picked.size ? "pb-24" : ""}`}>
      {dialog}

      {/* ── Toolbar: search · Select · sort ── */}
      <div className="flex flex-wrap items-center gap-2.5 fade-up">
        <label className="relative min-w-0 flex-1 basis-[240px]">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={full ? "Search jobs by role, company or city" : `Search all ${jobs.length} jobs`}
            aria-label="Search jobs"
            className="h-[2.6rem] w-full rounded-full border-[1.5px] border-line bg-card pl-10 pr-10 text-[0.92rem] outline-none transition placeholder:text-faint focus:border-brand"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-faint hover:bg-line-2 hover:text-ink"><X size={14} /></button>
          )}
        </label>
        {full && (
          <button
            type="button"
            onClick={() => (selecting ? stop() : setSelecting(true))}
            disabled={!jobs.length || !!progress}
            aria-pressed={selecting}
            className={`inline-flex h-[2.6rem] shrink-0 items-center gap-2 rounded-full border-[1.5px] px-4 text-[0.86rem] font-semibold transition disabled:opacity-50 ${selecting ? "border-side bg-side text-white" : "border-line bg-card text-ink hover:border-brand/40 hover:text-brand"}`}
          >
            {selecting ? <><X size={15} /> Cancel</> : <><ListChecks size={16} /> Select</>}
          </button>
        )}
        <div className="inline-flex shrink-0 gap-1 rounded-full border-[1.5px] border-line bg-card p-1" role="group" aria-label="Sort">
          {(["recent", "fit"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)} className={`rounded-full px-3.5 py-1.5 text-[0.84rem] font-semibold ${sort === k ? "bg-side text-white" : "text-muted hover:text-ink"}`}>
              {k === "recent" ? "Recent" : "Best fit"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filters (or, while selecting, the selection header in the same spot) ── */}
      {full && (
        <div className="flex min-h-[2.4rem] items-center gap-2 fade-up">
          {selecting ? (
            <>
              <button
                type="button"
                role="checkbox"
                aria-checked={allShownPicked ? true : someShownPicked ? "mixed" : false}
                onClick={() => setPicked((p) => { const n = new Set(p); shown.forEach((a) => (allShownPicked ? n.delete(a.id) : n.add(a.id))); return n; })}
                className="flex h-9 items-center gap-2.5 rounded-full pl-4 pr-3 text-[0.9rem] font-semibold text-ink hover:bg-line-2 sm:pl-5"
              >
                <Box on={allShownPicked} mixed={someShownPicked} />
                {allShownPicked ? "All selected" : `Select all ${shown.length}`}
              </button>
              {unanalysed.length > 0 && (
                <button type="button" onClick={() => setPicked(new Set(unanalysed.map((a) => a.id)))} className={chip(false)}>
                  Only not analysed <span className="tabular-nums opacity-70">{unanalysed.length}</span>
                </button>
              )}
            </>
          ) : (
            <div className="no-scrollbar -mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 py-0.5">
              <button type="button" onClick={() => setFilter("")} className={chip(!filter)}>All <span className="tabular-nums opacity-70">{jobs.length}</span></button>
              {unanalysed.length > 0 && (
                <button type="button" onClick={() => setFilter("new")} className={chip(filter === "new")}><span className="h-2 w-2 rounded-full bg-faint" />Not analysed <span className="tabular-nums opacity-70">{unanalysed.length}</span></button>
              )}
              {STATUSES.filter((s) => counts[s]).map((s) => (
                <button key={s} type="button" onClick={() => setFilter(s)} className={chip(filter === s)}>
                  <span className={`h-2 w-2 rounded-full ${STATUS_BAR[s]}`} />{STATUS_META[s].label} <span className="tabular-nums opacity-70">{counts[s]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {progress && <WorkingInline text={`Analysing ${progress.i} of ${progress.n}... keep this tab open`} />}
      {note && (
        <div role="status" className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 text-[0.9rem] font-medium fade-up ${note.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
          {note.ok && <Check size={15} strokeWidth={3} />} {note.text}
        </div>
      )}

      {/* ── The list ── */}
      <ul className="card divide-y divide-line overflow-hidden p-0 fade-up" aria-label={selecting ? "Select jobs" : "Jobs"}>
        {visible.map((a, i) => {
          const on = picked.has(a.id);
          const row = "flex min-h-[66px] w-full items-center gap-4 px-4 py-3.5 text-left transition sm:px-5"; // same height with or without a location line
          return (
            <li key={a.id}>
              {selecting ? (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={(e) => pick(i, e.shiftKey)}
                  onMouseDown={(e) => e.shiftKey && e.preventDefault()}
                  className={`${row} ${on ? "bg-brand-soft/70" : "hover:bg-line-2/70"}`}
                >
                  <JobRowContent a={a} practised={done} lead={<Box on={on} />} />
                </button>
              ) : (
                <Link href={`/jobs/${a.id}`} className={`${row} group hover:bg-line-2/70`}>
                  <JobRowContent a={a} practised={done} trailing={<ChevronRight size={17} className="hidden shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-brand sm:block" />} />
                </Link>
              )}
            </li>
          );
        })}
        {!visible.length && (
          <li className="px-5 py-10 text-center text-muted">
            {q ? <>No jobs match &ldquo;{query}&rdquo;. <button type="button" onClick={() => setQuery("")} className="font-semibold text-brand">Clear search</button></> : filter ? <>No jobs here. <button type="button" onClick={() => setFilter("")} className="font-semibold text-brand">Show all</button></> : "No jobs yet."}
          </li>
        )}
      </ul>
      {!full && !q && shown.length > limit && (
        <div className="flex justify-center">
          <Link href="/jobs" className="pill-nav">See all {shown.length} jobs <ArrowRight size={14} /></Link>
        </div>
      )}

      {/* ── Floating action bar: once something is picked; above the phone tab bar, centred on the content ── */}
      {full && picked.size > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 lg:bottom-6 lg:pl-[248px]">
          <div role="toolbar" aria-label="Selected jobs" className="pop pointer-events-auto flex max-w-full items-center gap-2 overflow-x-auto rounded-full bg-side py-1.5 pl-5 pr-1.5 text-white shadow-[0_18px_40px_-14px_rgba(0,40,90,.55)]">
            <span className="whitespace-nowrap text-[0.92rem] font-semibold tabular-nums">{picked.size} selected</span>
            <span className="mx-1 h-5 w-px shrink-0 bg-white/25" aria-hidden />
            <button className="btn btn-clay btn-sm shrink-0 !shadow-none" disabled={!toAnalyse.length || !!progress} onClick={analyseSelected} title={!toAnalyse.length ? "The selected jobs are already analysed" : undefined}>
              <Sparkles size={14} /> Analyse{toAnalyse.length ? ` ${toAnalyse.length}` : ""}
            </button>
            <button className="btn btn-sm shrink-0 bg-white/12 text-white hover:bg-bad" disabled={!!progress} onClick={deleteSelected}>
              <Trash2 size={14} /> Delete
            </button>
            <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/85 hover:bg-white/15" onClick={() => setPicked(new Set())} aria-label="Clear selection" data-tip="Clear selection"><X size={16} /></button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Round-cornered checkbox used by the list rows and the select-all header. */
function Box({ on, mixed = false }: { on: boolean; mixed?: boolean }) {
  return (
    <span aria-hidden className={`grid h-[1.3rem] w-[1.3rem] shrink-0 place-items-center rounded-md border-2 transition ${on || mixed ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>
      {on ? <Check size={13} strokeWidth={3} /> : mixed ? <Minus size={13} strokeWidth={3} /> : null}
    </span>
  );
}
