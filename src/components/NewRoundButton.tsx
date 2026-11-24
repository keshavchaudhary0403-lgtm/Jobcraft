"use client";

import { useTransition } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { restartSession } from "@/lib/actions";
import { Spinner } from "./client-ui";

/** Start a fresh round for the same job (same offer for salary talks). */
export function NewRoundButton({ sessionId, kind, variant = "header" }: { sessionId: string; kind: "interview" | "negotiation"; variant?: "header" | "call" }) {
  const [pending, start] = useTransition();
  const label = kind === "interview" ? "New round" : "New talk";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => restartSession(sessionId))}
      className={variant === "call" ? "btn btn-clay h-12 px-6 text-[1rem]" : "pill-action h-10"}
    >
      {pending ? <Spinner size={14} /> : <RotateCcw size={15} />} {label}
    </button>
  );
}

/** Shown in place of the voice banner once a round has ended. */
export function RoundDoneBanner({ sessionId, kind }: { sessionId: string; kind: "interview" | "negotiation" }) {
  return (
    <div className="dark-card flex flex-wrap items-center gap-4 p-5 fade-up">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/10 text-[#5fd99a] ring-4 ring-white/10"><CheckCircle2 size={26} /></span>
      <div className="min-w-0 flex-1">
        <div className="font-display text-[1.3rem] font-bold leading-tight">{kind === "interview" ? "This round is finished" : "This talk is finished"}</div>
        <div className="mt-0.5 text-[0.86rem] text-cream/70">{kind === "interview" ? "Check your scorecard, then practise again with fresh questions." : "Read the feedback, then try the talk again."}</div>
      </div>
      <NewRoundButton sessionId={sessionId} kind={kind} variant="call" />
    </div>
  );
}
