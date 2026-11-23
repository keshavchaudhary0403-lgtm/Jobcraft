import { Mic } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { SessionList } from "@/components/SessionList";
import { JobPicker } from "@/components/JobPicker";
import { startSession } from "@/lib/actions";
import type { Application, Session } from "@/lib/types";

export const metadata = { title: "Interviews" };

export default async function InterviewPage({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const { app: preselect } = await searchParams;
  const { supabase } = await requireUser();
  const [{ data: apps }, { data: sessions }] = await Promise.all([
    supabase.from("applications").select("id, company, role, status, analysis").order("updated_at", { ascending: false }).returns<Application[]>(),
    supabase.from("sessions").select("*").eq("kind", "interview").order("updated_at", { ascending: false }).limit(8).returns<Session[]>(),
  ]);
  const start = startSession.bind(null, "interview");
  const list = sessions ?? [];
  const scores = list.map((s) => (s.meta as unknown as { interview_report?: { score?: number } }).interview_report?.score).filter((x): x is number => typeof x === "number");
  const best = scores.length ? Math.max(...scores) : null;
  const last = scores[0] ?? null;
  const rounds = Math.min(list.length, 3);

  const STEPS = ["The hiring manager asks one question at a time", "Answer out loud - vague answers get a follow-up", "Six questions, then your score and a 9/10 answer"];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 pt-2 fade-up">
        <div>
          <h1 className="text-[2.6rem] font-bold leading-none">Interview<span className="text-clay">.</span></h1>
          <p className="mt-2 text-[1rem] text-muted">Six real questions, out loud. An honest score at the end.</p>
        </div>
        <div className="flex gap-2">
          <span className="flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2"><span className="font-display text-[1.3rem] font-bold leading-none text-brand">{rounds}/3</span><span className="text-[0.84rem] text-brand">rounds done</span></span>
          <span className="flex items-center gap-2 rounded-full border-[1.5px] border-line px-4 py-2"><span className="font-display text-[1.3rem] font-bold leading-none">{best ?? "-"}</span><span className="text-[0.84rem] text-muted">best score</span></span>
        </div>
      </header>

      <form action={start} className="grid items-stretch gap-5 fade-up lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="card flex flex-col p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-side font-display text-[0.8rem] font-bold text-cream">1</span>
            <h2 className="flex-1 text-[1.2rem] font-bold leading-none">Pick the job</h2>
          </div>
          <JobPicker
            apps={apps ?? []}
            preselect={preselect}
            otherFields={
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="company" className="field" placeholder="Company" />
                <input name="role" className="field" placeholder="Role" />
                <textarea name="jd" className="field sm:col-span-2" rows={4} placeholder="Job description (recommended)" />
              </div>
            }
          />
          <div className="mt-auto pt-5">
            <div className="mb-2 flex items-center justify-between text-[0.8rem]">
              <span className="font-semibold uppercase tracking-[0.14em] text-muted">Practice goal</span>
              <span className="text-muted">{rounds >= 3 ? "Three rounds done - nothing should surprise you now." : "Run it three times, fresh each time."}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">{[0, 1, 2].map((i) => <span key={i} className={`h-2 rounded-full ${i < rounds ? "bg-brand" : "bg-line-2"}`} />)}</div>
          </div>
        </section>

        <section className="dark-card flex flex-col p-6">
          <div className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-white/55">How a round works</div>
          <ol className="mt-4 flex-1 space-y-3">
            {STEPS.map((t, i) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 font-display text-[0.9rem] font-bold text-mustard">{i + 1}</span>
                <span className="text-[0.95rem] text-cream/90">{t}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-white/[.07] px-3 py-2.5"><div className="font-display text-[1.3rem] font-bold">{last ?? "-"}</div><div className="text-[0.8rem] text-white/55">last score</div></div>
            <div className="rounded-2xl bg-white/[.07] px-3 py-2.5"><div className="font-display text-[1.3rem] font-bold">{best ?? "-"}</div><div className="text-[0.8rem] text-white/55">best score</div></div>
          </div>
          <button className="btn btn-clay mt-4 h-12 w-full text-[1rem]"><Mic size={17} /> Start interview</button>
        </section>
      </form>

      {list.length > 0 && (
        <section className="card p-5 fade-up">
          <div className="mb-2 text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-muted">Past rounds</div>
          <SessionList sessions={list} base="/interview" />
        </section>
      )}
    </div>
  );
}
