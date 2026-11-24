import { requireUser } from "@/lib/auth";
import { PracticeHistory } from "@/components/RoundHistory";
import { groupRounds } from "@/lib/practice-history";
import { startSession } from "@/lib/actions";
import type { Application, Session } from "@/lib/types";
import { NegotiationForm } from "./NegotiationForm";

export const metadata = { title: "Salary talk" };

export default async function NegotiationPage({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const { app: preselect } = await searchParams;
  const { supabase, profile, user } = await requireUser();
  const [{ data: apps }, { data: sessions }] = await Promise.all([
    supabase.from("applications").select("id, company, role, status, company_type, location, analysis").order("updated_at", { ascending: false }).returns<Application[]>(),
    supabase.from("sessions").select("*").eq("kind", "negotiation").order("updated_at", { ascending: false }).limit(150).returns<Session[]>(),
  ]);
  const sorted = [...(apps ?? [])].sort((a, b) => Number(b.status === "offer") - Number(a.status === "offer"));
  const offers = sorted.filter((a) => a.status === "offer").length;
  const start = startSession.bind(null, "negotiation");
  const list = sessions ?? [];
  const company = new Map((apps ?? []).map((a) => [a.id, a.company]));
  const groups = groupRounds(list, (s) => (s.application_id ? company.get(s.application_id) ?? null : ((s.meta as { company?: string } | null)?.company ?? null)));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 pt-2 fade-up">
        <div>
          <h1 className="text-[2.6rem] font-bold leading-none">Salary<span className="text-clay">.</span></h1>
          <p className="mt-2 text-[1rem] text-muted">Is the offer fair? Then practise asking for more.</p>
        </div>
        <div className="flex gap-2">
          <span className="flex items-center gap-2 rounded-full bg-good-soft px-4 py-2"><span className="font-display text-[1.3rem] font-bold leading-none text-good">{offers}</span><span className="text-[0.84rem] text-good">offer{offers === 1 ? "" : "s"} in hand</span></span>
          <span className="flex items-center gap-2 rounded-full border-[1.5px] border-line px-4 py-2"><span className="font-display text-[1.3rem] font-bold leading-none">{list.length}</span><span className="text-[0.84rem] text-muted">practice talk{list.length === 1 ? "" : "s"}</span></span>
        </div>
      </header>

      <form action={start} className="fade-up">
        <NegotiationForm
          apps={sorted}
          preselect={preselect}
          userId={user.id}
          defaults={{ city: profile.city ?? "", current_ctc: profile.current_ctc ?? "", experience: profile.experience_years ?? "", strongest_proof: profile.strongest_proof ?? "" }}
          groups={groups}
        />
      </form>

      {groups.some((g) => g.key.startsWith("t:")) && (
        <section className="space-y-3 fade-up">
          <h2 className="px-1 text-[1.1rem] font-bold">Other offers you practised</h2>
          <PracticeHistory groups={groups.filter((g) => g.key.startsWith("t:"))} kind="negotiation" />
        </section>
      )}
    </div>
  );
}
