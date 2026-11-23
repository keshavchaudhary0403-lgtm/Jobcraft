import { Mic } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SessionList } from "@/components/SessionList";
import { startSession } from "@/lib/actions";
import type { Application, Session } from "@/lib/types";
import { AppOrCustom } from "./AppOrCustom";
import { HowItWorks } from "@/components/HowItWorks";

export const metadata = { title: "Interview practice" };

export default async function InterviewPage({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const { app: preselect } = await searchParams;
  const { supabase } = await requireUser();
  const [{ data: apps }, { data: sessions }] = await Promise.all([
    supabase.from("applications").select("id, company, role").order("updated_at", { ascending: false }).returns<Application[]>(),
    supabase.from("sessions").select("*").eq("kind", "interview").order("updated_at", { ascending: false }).limit(10).returns<Session[]>(),
  ]);
  const start = startSession.bind(null, "interview");

  return (
    <>
      <PageHeader title="Interview practice" sub="Six real questions by voice. An honest score at the end." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <form action={start} className="card ai-gradient p-7 fade-up">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-navy text-white shadow-lg"><Mic size={22} /></div>
          <div className="mt-5 text-lg font-medium">Which job are you preparing for?</div>
          <div className="mt-4"><AppOrCustom apps={apps ?? []} preselect={preselect} /></div>
          <button className="btn btn-brand mt-6 px-6 py-3">Start interview</button>
        </form>
        <div className="space-y-5 stagger">
          <HowItWorks steps={["The hiring manager asks one question at a time", "Answer out loud — it follows up if you're vague", "After 6 questions: your score and what a 9/10 answer sounds like"]} />
          <SessionList sessions={sessions ?? []} base="/interview" />
        </div>
      </div>
    </>
  );
}
