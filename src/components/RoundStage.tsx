"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, LayoutList, RotateCcw, Trash2 } from "lucide-react";
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
  nextNo,
  hubHref,
  review,
  children,
}: {
  sessionId: string;
  kind: "interview" | "negotiation";
  finished: boolean;
  roundNo: number;
  /** Number of the next round for this job (total rounds + 1). */
  nextNo?: number;
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
              {pending ? <Spinner /> : <RotateCcw size={16} />} Start {unit.toLowerCase()} {nextNo ?? roundNo + 1}
            </button>
          </div>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col">{ended && finished ? review : children}</div>
    </div>
  );
}

/** Round delete: one round red-soft bin button in the header (same as the job page's delete), with a confirm. */
export function RoundMenu({ onDelete, kind }: { onDelete: () => Promise<void>; kind: "interview" | "negotiation" }) {
  const [ask, dialog] = useAsk();
  const [busy, setBusy] = useState(false);
  const unit = kind === "interview" ? "round" : "talk";
  return (
    <>
      {dialog}
      <button
        type="button"
        disabled={busy}
        className="btn btn-danger-soft h-10 w-10 shrink-0 !rounded-full px-0"
        aria-label={`Delete ${unit}`}
        data-tip={`Delete this ${unit}`}
        onClick={async () => {
          const ok = await ask({ title: `Delete this ${unit}?`, body: "The conversation, transcript and scorecard are removed. This can't be undone.", confirm: "Delete", danger: true });
          if (ok === null) return;
          setBusy(true);
          await onDelete();
          setBusy(false);
        }}
      >
        {busy ? <Spinner /> : <Trash2 size={16} />}
      </button>
    </>
  );
}
