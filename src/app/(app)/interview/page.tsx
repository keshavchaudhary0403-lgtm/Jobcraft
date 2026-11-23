import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SessionList } from "@/components/SessionList";
import { startSession } from "@/lib/actions";
import type { Application, Session } from "@/lib/types";
import { AppOrCustom } from "./AppOrCustom";

export default async function InterviewPage({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const { app: preselect } = await searchParams;
  const { supabase } = await requireUser();
  const [{ data: apps }, { data: sessions }] = await Promise.all([
    supabase.from("applications").select("id, company, role, status").order("updated_at", { ascending: false }).returns<Application[]>(),
    supabase.from("sessions").select("*").eq("kind", "interview").order("updated_at", { ascending: false }).returns<Session[]>(),
  ]);
  const start = startSession.bind(null, "interview");

  return (
    <>
      <PageHeader eyebrow="Prompt 6" title="Mock interview">
        The AI plays the hiring manager: 6 questions, real follow-ups, no hints — then an honest score and what a 9/10 answer
        sounds like. Use voice. Run it 3 times, a fresh session each time, until nothing surprises you.
      </PageHeader>
      <form action={start} className="card mb-10 space-y-4 p-5 sm:p-6">
        <h2 className="font-medium">Start a new mock interview</h2>
        <AppOrCustom apps={apps ?? []} preselect={preselect} />
        <button className="btn btn-primary">Start interview</button>
      </form>
      <h2 className="mb-3 font-medium">Past sessions</h2>
      <SessionList sessions={sessions ?? []} base="/interview" empty="No mock interviews yet." />
    </>
  );
}
