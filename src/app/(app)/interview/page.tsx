import { Mic } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SessionList } from "@/components/SessionList";
import { startSession } from "@/lib/actions";
import type { Application, Session } from "@/lib/types";
import { AppOrCustom } from "./AppOrCustom";

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
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Interview practice" sub="Six real questions by voice. An honest score at the end." />
      <form action={start} className="card ai-gradient mb-8 p-6 fade-up">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-navy text-white shadow-lg"><Mic size={22} /></div>
          <div className="flex-1"><AppOrCustom apps={apps ?? []} preselect={preselect} /></div>
        </div>
        <button className="btn btn-brand mt-5 w-full sm:w-auto">Start interview</button>
      </form>
      <SessionList sessions={sessions ?? []} base="/interview" />
    </div>
  );
}
