"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, FileText, IndianRupee, Mic, RotateCcw, ScanSearch, Send, Target } from "lucide-react";
import { LinkedInIcon } from "./icons";

export type Move = { n: number; title: string; done: boolean; href: string };

/** What each move gives you - from the prompt PDF, in plain words. */
const MOVES: Record<number, { icon: React.ElementType; tone: number; what: string; why: string }> = {
  1: { icon: ScanSearch, tone: 0, what: "The 5 skills they rank highest, the 3 ATS keywords, and what they expect but never wrote.", why: "Know what the job really wants before you apply." },
  2: { icon: Target, tone: 1, what: "An honest fit score out of 10, your top 3 gaps, and short questions that settle anything unclear.", why: "See if it's worth applying, and what to fix first." },
  3: { icon: FileText, tone: 2, what: "Your resume rebuilt for this job: most relevant work first, their keywords where true, real results.", why: "One page, ATS-safe, nothing invented." },
  4: { icon: LinkedInIcon, tone: 3, what: "Three headlines, an About section and the 5 skills recruiters search for.", why: "Get found when recruiters search your role." },
  5: { icon: Send, tone: 4, what: "A short connection note and a message to the hiring manager, built around their real problem.", why: "Stand out before your resume is even read." },
  6: { icon: Mic, tone: 0, what: "Six questions out loud, follow-ups when you're vague, then an honest score and 9/10 answers.", why: "Walk in having already answered the hard ones." },
  7: { icon: IndianRupee, tone: 2, what: "Check if the offer is below, at or above market, then practise the call while HR pushes back.", why: "Ask for more with real numbers, calmly." },
};

/**
 * Home: the seven moves from the prompt PDF as icon pills, with a spotlight that explains one at a time.
 * Opens on your next move; hover or tap any pill to read about it.
 */
export function Playbook({ moves }: { moves: Move[] }) {
  const next = moves.find((m) => !m.done) ?? null;
  const [focus, setFocus] = useState<number>(next?.n ?? 1);
  const done = moves.filter((m) => m.done).length;

  return (
    <section className="card grid overflow-hidden fade-up lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      {/* Left: name, progress dots, the seven moves */}
      <div className="flex flex-col p-6 sm:p-7">
        <div>
        {/* Heading on the left, progress dots in the right corner of the same row */}
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[1.7rem] font-bold leading-tight">Your hiring playbook</h2>
          <div className="flex shrink-0 items-center gap-1.5" aria-label={`${done} of 7 done`}>
            {moves.map((m) => (
              <span
                key={m.n}
                className={`h-2 rounded-full transition-all ${m === next ? "w-7 bg-brand" : m.done ? "w-2 bg-good" : "w-2 bg-line"}`}
              />
            ))}
            <span className="ml-2 text-[0.8rem] font-semibold tabular-nums text-muted">{done}/7</span>
          </div>
        </div>
        <p className="mt-1 text-[0.95rem] text-muted">Seven moves from job post to offer. Tap one to see what it does.</p>
        </div>

        {/* Pills sit in the middle of the space left under the heading: even room above and below */}
        <div className="flex flex-1 flex-wrap content-center gap-x-[18px] gap-y-4" onMouseLeave={() => setFocus(next?.n ?? 1)}>
          {moves.map((m) => {
            const I = MOVES[m.n].icon;
            const on = m.n === focus;
            return (
              <button
                key={m.n}
                type="button"
                onMouseEnter={() => setFocus(m.n)}
                onFocus={() => setFocus(m.n)}
                onClick={() => setFocus(m.n)}
                className={`flex h-10 items-center gap-2 rounded-full border-[1.5px] pl-1.5 pr-4 text-[0.92rem] font-semibold transition ${
                  on ? "border-side bg-side text-cream" : m.done ? "border-transparent bg-good-soft/70 text-ink hover:border-good/40" : "border-line bg-card text-ink hover:border-brand/40"
                }`}
              >
                <span data-tone={on ? undefined : MOVES[m.n].tone} className={`grid h-7 w-7 place-items-center rounded-full ${on ? "bg-white/15 text-cream" : "tone-chip bg-line-2"}`}>
                  <I size={14} />
                </span>
                {m.title}
                {m.done && <Check size={14} strokeWidth={3} className={on ? "text-[#5fd99a]" : "text-good"} />}
                {m === next && <span className={`h-2 w-2 rounded-full ${on ? "bg-white" : "bg-clay"}`} aria-label="next" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: spotlight. All seven are laid in the same cell and only one is visible,
          so the panel is always as tall as the longest one - it never changes shape on hover. */}
      <div className="dark-card m-2 grid rounded-[22px] text-white lg:ml-0">
        {moves.map((m) => {
          const info = MOVES[m.n];
          const Icon = info.icon;
          const shown = m.n === focus;
          return (
            <div key={m.n} aria-hidden={!shown} className={`flex flex-col p-6 [grid-area:1/1] sm:p-7 ${shown ? "visible" : "invisible"}`}>
              <div className="flex items-center gap-2 text-[0.8rem]">
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-semibold">Move {m.n} of 7</span>
                {m === next ? (
                  <span className="rounded-full bg-clay px-2.5 py-0.5 font-bold uppercase tracking-[0.08em] text-white">Next</span>
                ) : m.done ? (
                  <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 font-semibold text-[#5fd99a]"><Check size={12} strokeWidth={3} /> Done</span>
                ) : null}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/15"><Icon size={22} /></span>
                <h3 className="font-display text-[1.6rem] font-bold leading-tight">{m.title}</h3>
              </div>
              <p className="mt-4 text-[0.98rem] leading-relaxed text-cream/90">{info.what}</p>
              <p className="mt-2 text-[0.88rem] text-white/85">{info.why}</p>
              <div className="mt-auto pt-6">
                <Link href={m.href} tabIndex={shown ? 0 : -1} className={m.done ? "pill-glass" : "btn btn-clay h-11 px-5"}>
                  {m.done ? <><RotateCcw size={14} /> Open again</> : <>Start <ArrowRight size={15} /></>}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
