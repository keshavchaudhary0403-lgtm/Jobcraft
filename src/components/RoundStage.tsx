"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, LayoutList, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { restartSession } from "@/lib/actions";
import { Spinner, useAsk } from "./client-ui";

/**
 * The round's main area. While the round runs it shows the call/chat (children).
 * Once it ends (on load, or live) it shows ONE finished panel - the only place to start the next round -
 * and, for a round that was already finished, the read-only transcript (review).
 */
export function RoundStage({
  sessionId,
  kind,
  finished,
  roundNo,
  hubHref,
  review,
  children,
}: {
  sessionId: string;
  kind: "interview" | "negotiation";
  finished: boolean;
  roundNo: number;
  hubHref: string;
  review: React.ReactNode;
  children: React.ReactNode;
}) {
  const [ended, setEnded] = useState(finished);
  const [pending, start] = useTransition();
  useEffect(() => {
    const on = (e: Event) => { if ((e as CustomEvent).detail?.sessionId === sessionId) setEnded(true); };
    window.addEventListener("jc:practice-ended", on);
    return () => window.removeEventListener("jc:practice-ended", on);
  }, [sessionId]);

  const unit = kind === "interview" ? "Round" : "Talk";
  return (
    <div className="flex h-full flex-col gap-4">
      {ended && (
        <div className="dark-card flex shrink-0 flex-wrap items-center gap-4 p-5 fade-up">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/10 text-[#5fd99a] ring-4 ring-white/10"><CheckCircle2 size={26} /></span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-[1.35rem] font-bold leading-tight">{unit} {roundNo} complete</div>
            <p className="mt-0.5 text-[0.86rem] text-cream/85">
              {kind === "interview" ? "Read your scorecard, study the weak answers, then go again with fresh questions." : "Read HR's feedback, then practise the talk again."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={hubHref} className="flex h-12 items-center gap-1.5 rounded-full bg-white/10 px-4 font-semibold text-cream transition hover:bg-white/20"><LayoutList size={16} /> All {unit.toLowerCase()}s</Link>
            <button type="button" disabled={pending} onClick={() => start(() => restartSession(sessionId))} className="btn btn-clay h-12 px-6 text-[1rem]">
              {pending ? <Spinner /> : <RotateCcw size={16} />} Start {unit.toLowerCase()} {roundNo + 1}
            </button>
          </div>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col">{ended && finished ? review : children}</div>
    </div>
  );
}

/** Quiet "⋯" menu for rare actions on a round (delete), so they don't compete with the main task. */
export function RoundMenu({ onDelete, kind }: { onDelete: () => Promise<void>; kind: "interview" | "negotiation" }) {
  const [open, setOpen] = useState(false);
  const [ask, dialog] = useAsk();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const unit = kind === "interview" ? "round" : "talk";
  return (
    <div ref={ref} className="relative">
      {dialog}
      <button type="button" onClick={() => setOpen(!open)} className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-line-2 hover:text-ink" aria-label="More">
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="pop absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-2xl border border-line bg-card p-1.5 shadow-xl">
          <button
            type="button"
            className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[0.9rem] text-bad hover:bg-bad-soft"
            onClick={async () => {
              setOpen(false);
              const ok = await ask({ title: `Delete this ${unit}?`, body: "The conversation, transcript and scorecard are removed. This can't be undone.", confirm: "Delete", danger: true });
              if (ok !== null) await onDelete();
            }}
          >
            <Trash2 size={15} /> Delete {unit}
          </button>
        </div>
      )}
    </div>
  );
}
