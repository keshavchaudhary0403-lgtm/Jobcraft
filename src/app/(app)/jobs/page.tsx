import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { JobsGrid } from "@/components/JobsGrid";
import { requireUser } from "@/lib/auth";
import type { Application } from "@/lib/types";

export const metadata = { title: "Jobs" };


export default async function JobsPage({ searchParams }: { searchParams: Promise<{ status?: string; sort?: string }> }) {
  const { status, sort = "recent" } = await searchParams;
  const { supabase } = await requireUser();
  const [{ data: all }, { data: sessions }] = await Promise.all([
    supabase.from("applications").select("*").order("updated_at", { ascending: false }).returns<Application[]>(),
    supabase.from("sessions").select("application_id").eq("kind", "interview"),
  ]);
  const jobs = all ?? [];
  const practised = new Set((sessions ?? []).map((s) => s.application_id).filter(Boolean) as string[]);
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 pt-2 fade-up">
        <div>
          <h1 className="text-[2.6rem] font-bold leading-none">Jobs<span className="text-clay">.</span></h1>
          <p className="mt-2 text-[1rem] text-muted">Every job, from decode to offer.</p>
        </div>

      </header>

      {!jobs.length ? (
        <Link href="/jobs/new" className="group card card-hover flex items-center gap-5 p-6 fade-up">
          <span data-tone="1" className="tone-chip grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-line-2"><Plus size={24} /></span>
          <span className="flex-1">
            <span className="block font-display text-[1.35rem] font-bold">Add the first job you want</span>
            <span className="block text-muted">Paste the description. We do the rest.</span>
          </span>
          <span className="pill-action hidden sm:inline-flex">Add a job <ArrowRight size={15} /></span>
        </Link>
      ) : (
        <>
          {/* Search, filters, sort and Select all live in the list itself (instant, no page reload). */}
          <JobsGrid jobs={jobs} practised={[...practised]} initialFilter={status} initialSort={sort} />
        </>
      )}
    </div>
  );
}

