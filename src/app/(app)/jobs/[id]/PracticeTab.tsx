"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { ArrowRight, IndianRupee, Mic } from "lucide-react";
import type { Application, Session } from "@/lib/types";
import type { InterviewReport, OfferCheck } from "@/lib/tasks";
import { startSession } from "@/lib/actions";
import { JobCard } from "@/components/RoundHistory";
import { Spinner } from "@/components/client-ui";

function StartRound({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={`btn btn-clay h-12 w-full px-6 text-[1rem] sm:w-auto ${pending ? "pointer-events-none" : ""}`} aria-busy={pending}>
      {pending ? <Spinner /> : <Mic size={17} />} {pending ? "Starting..." : label}
    </button>
  );
}

/** This job's practice: the same track card as the Interview page, plus a quiet link to salary practice. */
export function PracticeTab({ app, interviews }: { app: Application; interviews: Session[] }) {
  const start = startSession.bind(null, "interview");
  const rounds = [...interviews]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((s) => {
      const m = (s.meta ?? {}) as { interview_report?: InterviewReport; offer_check?: OfferCheck };
      return { id: s.id, created_at: s.created_at, report: m.interview_report ?? null, offer: m.offer_check ?? null };
    });
  const g = { key: app.id, title: `${app.role} @ ${app.company}`, company: app.company, rounds };

  return (
    <div className="space-y-4">
      <form action={start}>
        <input type="hidden" name="application_id" value={app.id} />
        <JobCard g={g} kind="interview" cta={<StartRound label={`Start round ${rounds.length + 1}`} />} />
      </form>
      <Link href={`/negotiation?app=${app.id}`} className="card card-hover flex items-center gap-3 p-4">
        <span data-tone="2" className="tone-chip grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-line-2"><IndianRupee size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Salary talk</span>
          <span className="block text-[0.84rem] text-muted">When the offer comes: check it, then rehearse the call.</span>
        </span>
        <span className="pill-nav shrink-0">Practise <ArrowRight size={14} /></span>
      </Link>
    </div>
  );
}
