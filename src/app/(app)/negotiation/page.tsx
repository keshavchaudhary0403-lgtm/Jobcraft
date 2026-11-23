import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SessionList } from "@/components/SessionList";
import { startSession } from "@/lib/actions";
import type { Application, Session } from "@/lib/types";
import { NegotiationForm } from "./NegotiationForm";
import { HowItWorks } from "@/components/HowItWorks";

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
    <>
      <PageHeader title="Salary negotiation" sub="Know if the offer is fair. Then practise asking for more." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <form action={start} className="card p-7 fade-up">
          <NegotiationForm
            apps={sorted}
            preselect={preselect}
            defaults={{ city: profile.city ?? "", current_ctc: profile.current_ctc ?? "", experience: profile.experience_years ?? "", strongest_proof: profile.strongest_proof ?? "" }}
          />
        </form>
        <div className="space-y-5 stagger">
          <HowItWorks steps={["See if the offer is below, at or above market", "Get a realistic counter range", "Make your counter out loud — HR pushes back", "Say stop for feedback"]} />
          <SessionList sessions={sessions ?? []} base="/negotiation" />
        </div>
      </div>
    </>
  );
}
