"use client";

import { CompanyWordmark } from "./CompanyWordmark";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, IndianRupee } from "lucide-react";
import { CopyButton } from "./client-ui";

import type { PracticeGroup, RoundRow } from "@/lib/practice-history";

const scoreTone = (s: number) => (s >= 8 ? "bg-good-soft text-good" : s >= 6 ? "bg-mustard-soft text-mustard-ink" : "bg-bad-soft text-bad");
const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const POS = { below: { t: "Below market", c: "bg-bad-soft text-bad" }, at: { t: "At market", c: "bg-brand-soft text-brand" }, above: { t: "Above market", c: "bg-good-soft text-good" } } as const;
const qText = (q: string) => q.replace(/^Q\d+\s*[:.-]\s*/i, "");

/** Weak answers from every round of one job, repeats removed, newest first. */
function prepItems(rounds: RoundRow[]) {
  const seen = new Set<string>();
  const items: { q: string; why: string; better: string; round: number }[] = [];
  rounds.forEach((r, i) => {
    for (const w of r.report?.weakest ?? []) {
      const q = qText(w.question);
      const k = q.toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 60);
      if (seen.has(k)) continue;
      seen.add(k);
      items.push({ q, why: w.why_weak, better: w.better_answer, round: i + 1 });
    }
  });
  return items.reverse();
}

/**
 * Practice history, one card per job: score trend, every round (open any to revisit it) and,
 * for interviews, a study list of weak answers with 9/10 versions.
 */
export function PracticeHistory({ groups, kind }: { groups: PracticeGroup[]; kind: "interview" | "negotiation" }) {
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <JobCard key={g.key} g={g} kind={kind} />
      ))}
    </div>
  );
}

/** One job's practice track. `cta` sits in the header (e.g. Start round N); `flat` drops the card shell. */
/** `heading` replaces the company logo + role (used inside a job page, where the banner already shows them). */
/** `brand` passes the job's saved logo/website so the header matches the job picker (else the logo is guessed from the name). */
export function JobCard({ g, kind, cta, flat = false, noHead = false, heading, brand }: { g: PracticeGroup; kind: "interview" | "negotiation"; cta?: React.ReactNode; flat?: boolean; noHead?: boolean; heading?: React.ReactNode; brand?: { jobUrl?: string | null; domain?: string | null; logo?: string | null } }) {
  const base = kind === "interview" ? "/interview" : "/negotiation";
  const items = kind === "interview" ? prepItems(g.rounds) : [];
  const [tab, setTab] = useState<"rounds" | "prep">("rounds");
  const [open, setOpen] = useState<number | null>(0);
  const scores = g.rounds.map((r) => r.report?.score).filter((s): s is number => typeof s === "number");
  const best = scores.length ? Math.max(...scores) : null;
  const gain = scores.length > 1 ? (best ?? 0) - scores[0] : 0;
  const focus = [...g.rounds].reverse().find((r) => r.report?.next_focus)?.report?.next_focus;
  const unit = kind === "interview" ? "round" : "talk";

  return (
    <section className={flat ? "" : "card overflow-hidden"}>
      {!noHead && <div className="flex flex-wrap items-center gap-3 p-5">
        <div className="min-w-0 flex-1">
          {heading ?? (
            <>
              {g.company && <CompanyWordmark name={g.company} jobUrl={brand?.jobUrl} domain={brand?.domain} logo={brand?.logo} height={30} iconSize={28} className="mb-1.5" nameClass="truncate text-[0.88rem] font-bold text-ink" />}
              <h3 className="line-clamp-1 text-[1.1rem] font-bold leading-tight">{g.company ? g.title.split(" @ ")[0] : g.title}</h3>
            </>
          )}
          <p className="text-[0.84rem] text-muted">
            {kind === "interview" ? (g.rounds.length ? "" : "No rounds yet") : g.rounds.length ? <>{g.rounds.length} {unit}{g.rounds.length === 1 ? "" : "s"}</> : `No ${unit}s yet`}
            {best != null && <>{kind === "interview" ? "Best" : " · best"} <b className="text-ink">{best}/10</b></>}
            {gain > 0 && <span className="text-good"> · up {gain} since your first</span>}
          </p>
        </div>
        {scores.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {scores.slice(-6).map((s, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-[0.8rem] text-faint">→</span>}
                <span className={`grid h-8 w-8 place-items-center rounded-full font-display text-[0.88rem] font-bold ${scoreTone(s)}`}>{s}</span>
              </span>
            ))}
          </div>
        )}
        {cta && <div className="w-full sm:w-auto">{cta}</div>}
      </div>}

      {kind === "interview" && (
        <div className="px-5">
          <div className="inline-flex gap-1 rounded-full border-[1.5px] border-line p-1">
            {([["rounds", `Rounds`, g.rounds.length], ["prep", "Questions to prepare", items.length]] as const).map(([k, l, n]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={`flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[0.84rem] font-semibold transition ${tab === k ? "bg-side text-cream" : "text-muted hover:text-ink"}`}>
                {l} <span className={`rounded-full px-1.5 text-[0.72rem] tabular-nums ${tab === k ? "bg-white/20" : "bg-line-2"}`}>{n}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "rounds" && g.rounds.length === 0 ? (
        <p className="m-5 mt-3 rounded-2xl bg-line-2/70 px-4 py-6 text-center text-[0.88rem] text-muted">Your {unit}s for this {kind === "interview" ? "job" : "offer"} will show up here, with their scores.</p>
      ) : tab === "rounds" ? (
        <ol className="grid gap-2.5 px-5 pb-5 pt-3 sm:grid-cols-2 xl:grid-cols-3">
          {[...g.rounds].reverse().map((r) => {
            const n = g.rounds.indexOf(r) + 1;
            const s = r.report?.score;
            const pos = r.offer?.position;
            return (
              <li key={r.id}>
                <Link href={`${base}/${r.id}`} className="group flex items-center gap-3 rounded-2xl bg-line-2/70 px-3 py-2.5 ring-1 ring-transparent transition hover:bg-brand-soft/60 hover:ring-brand/25">
                  {kind === "negotiation" ? (
                    <span data-tone="2" className="tone-chip grid h-10 w-10 shrink-0 place-items-center rounded-full bg-line-2"><IndianRupee size={16} /></span>
                  ) : (
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-[0.95rem] font-bold ${typeof s === "number" ? scoreTone(s) : "bg-line-2 text-faint"}`}>{typeof s === "number" ? s : "-"}</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.92rem] font-semibold">{kind === "interview" ? "Round" : "Talk"} {n}</span>
                    <span className="flex flex-wrap items-center gap-1.5 text-[0.78rem] text-muted">
                      {when(r.created_at)}
                      {pos && POS[pos] && <span className={`chip py-0 text-[0.74rem] ${POS[pos].c}`}>{POS[pos].t}</span>}
                    </span>
                  </span>
                  <ArrowUpRight size={15} className="shrink-0 text-faint transition group-hover:text-ink" />
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="space-y-3 p-5 pt-4">
          {focus && <div className="rounded-2xl bg-brand-soft px-4 py-3 text-[0.86rem] text-brand-ink"><b>Work on next:</b> {focus}</div>}
          {items.length === 0 ? (
            <p className="rounded-2xl bg-line-2/70 px-4 py-6 text-center text-[0.88rem] text-muted">Finish a round and get its scorecard to build this list.</p>
          ) : (
            <div className="divide-y divide-line overflow-hidden rounded-2xl ring-1 ring-line">
              {items.map((x, i) => (
                <div key={i} className={open === i ? "bg-line-2/50" : "bg-card"}>
                  <button type="button" onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition hover:bg-line-2/60">
                    <span className="mt-0.5 shrink-0 rounded-full bg-line-2 px-2 py-0.5 text-[0.7rem] font-semibold text-muted">Round {x.round}</span>
                    <span className="flex-1 text-[0.92rem] font-semibold leading-snug">{x.q}</span>
                    <ChevronDown size={16} className={`mt-0.5 shrink-0 text-faint transition ${open === i ? "rotate-180" : ""}`} />
                  </button>
                  {open === i && (
                    <div className="grid gap-2.5 px-3.5 pb-3.5 lg:grid-cols-2">
                      <div className="rounded-xl border-l-4 border-bad bg-card px-3.5 py-2.5">
                        <div className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-bad">Why it was weak</div>
                        <p className="mt-1 text-[0.88rem] leading-relaxed">{x.why}</p>
                      </div>
                      <div className="rounded-xl border-l-4 border-good bg-card px-3.5 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-good">A 9/10 answer</span>
                          <CopyButton text={x.better} />
                        </div>
                        <p className="mt-1 text-[0.88rem] leading-relaxed">{x.better}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
