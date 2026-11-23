import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SessionList } from "@/components/SessionList";
import { startSession } from "@/lib/actions";
import type { Application, Session } from "@/lib/types";
import { NegotiationForm } from "./NegotiationForm";

export default async function NegotiationPage({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const { app: preselect } = await searchParams;
  const { supabase, profile } = await requireUser();
  const [{ data: apps }, { data: sessions }] = await Promise.all([
    supabase.from("applications").select("id, company, role, status, company_type").order("updated_at", { ascending: false }).returns<Application[]>(),
    supabase.from("sessions").select("*").eq("kind", "negotiation").order("updated_at", { ascending: false }).returns<Session[]>(),
  ]);
  const sorted = [...(apps ?? [])].sort((a, b) => Number(b.status === "offer") - Number(a.status === "offer"));
  const start = startSession.bind(null, "negotiation");

  return (
    <>
      <PageHeader eyebrow="Prompt 7" title="Salary negotiation coach">
        First an honest check: is the offer below, at, or above market — and a realistic counter range. Then the AI becomes HR
        and pushes back, one objection at a time. Practise out loud before the real call.
      </PageHeader>
      <form action={start} className="card mb-10 space-y-4 p-5 sm:p-6">
        <NegotiationForm
          apps={sorted}
          preselect={preselect}
          defaults={{
            city: profile.city ?? "",
            current_ctc: profile.current_ctc ?? "",
            experience: profile.experience_years ?? "",
            strongest_proof: profile.strongest_proof ?? "",
          }}
        />
        <p className="text-xs text-muted">
          Look up the real range on AmbitionBox or Glassdoor first. The AI treats its own salary knowledge as a rough starting point, not the truth.
        </p>
        <button className="btn btn-primary">Start practice</button>
      </form>
      <h2 className="mb-3 font-medium">Past sessions</h2>
      <SessionList sessions={sessions ?? []} base="/negotiation" empty="No negotiation practice yet." />
    </>
  );
}
