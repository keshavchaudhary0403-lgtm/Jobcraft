import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SessionList } from "@/components/SessionList";
import { startSession } from "@/lib/actions";
import type { Application, Session } from "@/lib/types";
import { NegotiationForm } from "./NegotiationForm";

export const metadata = { title: "Salary negotiation" };

export default async function NegotiationPage({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const { app: preselect } = await searchParams;
  const { supabase, profile } = await requireUser();
  const [{ data: apps }, { data: sessions }] = await Promise.all([
    supabase.from("applications").select("id, company, role, status, company_type, location").order("updated_at", { ascending: false }).returns<Application[]>(),
    supabase.from("sessions").select("*").eq("kind", "negotiation").order("updated_at", { ascending: false }).limit(10).returns<Session[]>(),
  ]);
  const sorted = [...(apps ?? [])].sort((a, b) => Number(b.status === "offer") - Number(a.status === "offer"));
  const start = startSession.bind(null, "negotiation");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Salary negotiation" sub="Know if the offer is fair. Then practise asking for more." />
      <form action={start} className="card mb-8 p-6 fade-up">
        <NegotiationForm
          apps={sorted}
          preselect={preselect}
          defaults={{ city: profile.city ?? "", current_ctc: profile.current_ctc ?? "", experience: profile.experience_years ?? "", strongest_proof: profile.strongest_proof ?? "" }}
        />
      </form>
      <SessionList sessions={sessions ?? []} base="/negotiation" />
    </div>
  );
}
