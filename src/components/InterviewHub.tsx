"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Mic, Plus } from "lucide-react";
import type { Application } from "@/lib/types";
import type { PracticeGroup } from "@/lib/practice-history";
import { JobPicker } from "./JobPicker";
import { JobCard, PracticeHistory } from "./RoundHistory";
import { Spinner } from "./client-ui";
import { HowItWorks } from "./HowItWorks";

type PickApp = Pick<Application, "id" | "company" | "role" | "status" | "analysis">;

/** The one button that starts a round. Shows progress so it never looks stuck. */
function StartRound({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={`btn btn-clay h-12 w-full px-6 text-[1rem] sm:w-auto ${pending ? "pointer-events-none" : ""}`} aria-busy={pending}>
      {pending ? <Spinner /> : <Mic size={17} />} {pending ? "Starting..." : label}
    </button>
  );
}

const STEPS = ["The hiring manager asks one question at a time", "Answer out loud - vague answers get a follow-up", "After six questions: your score and model answers"];

/**
 * Interview hub: pick a job, and right under it see that job's practice track -
 * score trend, every round, questions to prepare - with the single "Start round" button.
 */
export function InterviewHub({ apps, preselect, groups, otherFields }: { apps: PickApp[]; preselect?: string; groups: PracticeGroup[]; otherFields: React.ReactNode }) {
  const initial = apps.find((a) => a.id === preselect)?.id ?? apps[0]?.id ?? "";
  const [sel, setSel] = useState(initial);
  const app = apps.find((a) => a.id === sel);
  const track: PracticeGroup | null = app ? groups.find((g) => g.key === app.id) ?? { key: app.id, title: `${app.role} @ ${app.company}`, company: app.company, rounds: [] } : null;
  const custom = groups.filter((g) => g.key.startsWith("t:"));

  return (
    <div className="space-y-5">
      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="card p-6">
          <h2 className="mb-4 text-[1.2rem] font-bold leading-none">Which job are you practising for?</h2>
          <JobPicker apps={apps} preselect={initial} onPick={setSel} otherFields={otherFields} />
        </section>
        <HowItWorks title="How a round works" steps={STEPS} tip="Do about 3 rounds per job. Between rounds, study the questions you found hardest." />
      </div>

      {track ? (
        <JobCard g={track} kind="interview" cta={<StartRound label={`Start round ${track.rounds.length + 1}`} />} />
      ) : (
        <section className="card flex flex-wrap items-center gap-4 p-5">
          <span data-tone="1" className="tone-chip grid h-11 w-11 place-items-center rounded-xl bg-line-2"><Plus size={20} /></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[1.1rem] font-bold leading-tight">Another role</h3>
            <p className="text-[0.84rem] text-muted">Fill in the company and role above, then start.</p>
          </div>
          <StartRound label="Start round 1" />
        </section>
      )}

      {custom.length > 0 && (
        <section className="space-y-3">
          <h2 className="px-1 text-[1.1rem] font-bold">Other roles you practised</h2>
          <PracticeHistory groups={custom} kind="interview" />
        </section>
      )}
    </div>
  );
}
