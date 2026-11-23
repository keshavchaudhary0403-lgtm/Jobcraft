import { Mic } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SessionList } from "@/components/SessionList";
import { HowItWorks } from "@/components/HowItWorks";
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

  return (
    <>
      <PageHeader title="Mock interview" sub="Six real questions by voice. An honest score at the end." />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form action={start} className="card overflow-hidden fade-up">
          <div className="border-b border-line px-5 py-4">
            <div className="font-semibold">Which job is the interview for?</div>
            <div className="text-[0.88rem] text-muted">The interviewer uses that job description and your resume.</div>
          </div>
          <div className="p-5">
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
          </div>
          <div className="flex items-center justify-between border-t border-line bg-slate-50/60 px-5 py-3.5">
            <span className="text-[0.85rem] text-muted">Works best in Chrome, with a mic</span>
            <button className="btn btn-brand"><Mic size={15} /> Start interview</button>
          </div>
        </form>
        <div className="space-y-4 stagger">
          <HowItWorks steps={["The hiring manager asks one question at a time", "Answer out loud — it follows up if you're vague", "After 6 questions: your score and what a 9/10 answer sounds like"]} />
          <SessionList sessions={sessions ?? []} base="/interview" />
        </div>
      </div>
    </>
  );
}
