import { requireUser } from "@/lib/auth";
import { groupRounds } from "@/lib/practice-history";
import { InterviewHub } from "@/components/InterviewHub";
import { startSession } from "@/lib/actions";
import type { Application, Session } from "@/lib/types";

export const metadata = { title: "Interviews" };

export default async function InterviewPage({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const { app: preselect } = await searchParams;
  const { supabase } = await requireUser();
  const [{ data: apps }, { data: sessions }] = await Promise.all([
    supabase.from("applications").select("*").order("updated_at", { ascending: false }).returns<Application[]>(),
    supabase.from("sessions").select("*").eq("kind", "interview").order("updated_at", { ascending: false }).limit(150).returns<Session[]>(),
  ]);
  const start = startSession.bind(null, "interview");
  const list = sessions ?? [];
  const scores = list.map((s) => (s.meta as unknown as { interview_report?: { score?: number } }).interview_report?.score).filter((x): x is number => typeof x === "number");
  const best = scores.length ? Math.max(...scores) : null;
  const company = new Map((apps ?? []).map((a) => [a.id, a.company]));
  const groups = groupRounds(list, (s) => (s.application_id ? company.get(s.application_id) ?? null : ((s.meta as { company?: string } | null)?.company ?? null)));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 pt-2 fade-up">
        <div>
          <h1 className="text-[2.6rem] font-bold leading-none">Interview<span className="text-clay">.</span></h1>
          <p className="mt-2 text-[1rem] text-muted">Six questions, out loud, with an honest score.</p>
        </div>
        <div className="flex gap-2">
          <span className="flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2"><span className="font-display text-[1.3rem] font-bold leading-none text-brand">{list.length}</span><span className="text-[0.84rem] text-brand">round{list.length === 1 ? "" : "s"} practised</span></span>
          {best != null && <span className="flex items-center gap-2 rounded-full border-[1.5px] border-line px-4 py-2"><span className="font-display text-[1.3rem] font-bold leading-none">{best}/10</span><span className="text-[0.84rem] text-muted">best score</span></span>}
        </div>
      </header>

      <form action={start} className="fade-up">
        <InterviewHub
          apps={apps ?? []}
          preselect={preselect}
          groups={groups}
          otherFields={<div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label">Company <span className="text-clay">*</span></label><input name="company" required maxLength={80} className="field" placeholder="e.g. Swiggy" /></div>
                <div><label className="label">Role <span className="text-clay">*</span></label><input name="role" required maxLength={90} className="field" placeholder="e.g. Category Manager" /></div>
                <div className="sm:col-span-2"><label className="label">Job description <span className="rounded-full bg-line-2 px-1.5 py-px text-[0.7rem] font-semibold text-muted">Recommended</span></label><textarea name="jd" className="field" rows={4} placeholder="Paste it so questions match the real job" /></div>
              </div>}
        />
      </form>
    </div>
  );
}
