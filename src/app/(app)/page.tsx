import Link from "next/link";
import { ArrowRight, Mic, Plus, Target } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { JobTile } from "@/components/JobTiles";
import type { Application } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { createServiceClient } from "@/lib/supabase/server";
import { getSettings, monthStartIST } from "@/lib/ai";
import { resumeHealth } from "@/lib/resume-health";
import { journey } from "@/lib/journey";

function greeting() {
  const h = new Date(Date.now() + 5.5 * 3600e3).getUTCHours();
  return h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
}
function lastWeek() {
  const now = Date.now();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 864e5 + 5.5 * 3600e3);
    return { key: d.toISOString().slice(0, 10), day: d.toLocaleDateString("en-IN", { weekday: "narrow", timeZone: "UTC" }) };
  });
}

export default async function Home() {
  const { supabase, profile } = await requireUser();
  const [{ data: apps }, { data: sessions }, settings, { data: usage }] = await Promise.all([
    supabase.from("applications").select("*").order("updated_at", { ascending: false }).returns<Application[]>(),
    supabase.from("sessions").select("application_id, kind, meta").in("kind", ["interview", "negotiation"]).order("updated_at", { ascending: true }),
    getSettings(createServiceClient()),
    supabase.from("usage_events").select("cost_usd").gte("created_at", monthStartIST()),
  ]);
  const all = apps ?? [];
  const live = all.filter((a) => !["rejected", "withdrawn"].includes(a.status));
  const interviews = (sessions ?? []).filter((s) => s.kind === "interview");
  const practised = new Set(interviews.map((s) => s.application_id).filter(Boolean) as string[]);
  const scores = interviews.map((s) => (s.meta as { interview_report?: { score?: number } } | null)?.interview_report?.score).filter((x): x is number => typeof x === "number");
  const spent = (usage ?? []).reduce((t, r) => t + Number(r.cost_usd), 0) * settings.usd_to_inr;
  const limit = profile.monthly_limit_inr ?? settings.default_monthly_limit_inr;
  const first = profile.full_name?.split(" ")[0];
  const health = profile.master_resume?.trim() ? resumeHealth(profile.master_resume).score : null;

  // Search score
  const fits = live.filter((a) => a.analysis).map((a) => (a.analysis as Analysis).fit_score * 10);
  const avg = fits.length ? Math.round(fits.reduce((t, x) => t + x, 0) / fits.length) : null;
  const week = lastWeek().map((d) => ({ ...d, n: all.filter((a) => a.applied_on === d.key).length }));
  const thisWeek = week.reduce((t, d) => t + d.n, 0);
  const GOAL = 5;
  const saved = live.filter((a) => a.status === "saved");
  const prepDone = saved.reduce((t, a) => t + journey(a, practised).slice(0, 4).filter((s) => s.done).length, 0);
  const parts = [
    { label: "Resume", show: health != null ? `${health}/100` : "Not added", color: "#ffffff", value: (health ?? 0) / 100, weight: 20, lift: "Strengthen your resume", href: "/profile" },
    { label: "Job match", show: avg != null ? `${avg}% avg` : "No jobs", color: "#ffffff", value: (avg ?? 0) / 100, weight: 20, lift: "Add jobs that fit you better", href: "/jobs/new" },
    { label: "Job prep", show: `${Math.round((saved.length ? prepDone / (saved.length * 4) : all.length ? 1 : 0) * 100)}%`, color: "#ffffff", value: saved.length ? prepDone / (saved.length * 4) : all.length ? 1 : 0, weight: 15, lift: "Finish prepping saved jobs", href: "/jobs" },
    { label: "Applied this week", show: `${thisWeek}/${GOAL}`, color: "#ffffff", value: Math.min(thisWeek / GOAL, 1), weight: 20, lift: thisWeek ? "Apply to more this week" : "Send your first application", href: "/jobs" },
    { label: "Mock interviews", show: `${Math.min(interviews.length, 3)}/3`, color: "#ffffff", value: Math.min(interviews.length / 3, 1), weight: 15, lift: "Do a mock interview", href: "/interview" },
    { label: "LinkedIn", show: profile.linkedin_result ? "Done" : "Not yet", color: "#ffffff", value: profile.linkedin_result ? 1 : 0, weight: 10, lift: "Rewrite your LinkedIn", href: "/linkedin" },
  ];
  const score = Math.round(parts.reduce((t, p) => t + p.weight * p.value, 0));
  const lift = [...parts].sort((x, y) => y.weight * (1 - y.value) - x.weight * (1 - x.value))[0];
  const gain = Math.round(lift.weight * (1 - lift.value));
  const word = score >= 75 ? "Interview-ready" : score >= 40 ? "Building momentum" : "Just getting started";

  return (
    <div className="space-y-5">
      {/* ── Hero band ── */}
      <section className="dark-card overflow-hidden fade-up">
        <div className="p-6 sm:p-7">
          {/* Row 1: greeting left, readiness right (same row on every screen size) */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="min-w-0 text-[1.85rem] font-bold leading-[1] text-white sm:text-[2.6rem]">{greeting()}{first ? `, ${first}` : ""}<span className="text-clay">.</span></h1>
            <Link href={lift.href} data-tip="How ready your job search is: resume, job match, prep, applications, mock interviews and LinkedIn" className="shrink-0 text-right">
              <span className="block font-display text-[2.1rem] font-bold leading-none tabular-nums text-white sm:text-[2.6rem]">{score}<span className="text-[1.05rem] text-white/70 sm:text-[1.3rem]">%</span></span>
              <span className="mt-1 block text-[0.76rem] text-white/65 sm:text-[0.84rem]">ready<span className="hidden sm:inline"> · {word}</span></span>
            </Link>
          </div>
          {/* Row 2: context chips */}
          <div className="mt-3 flex flex-wrap gap-2 text-[0.84rem]">
            {profile.target_role && <Link href="/profile" className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/20"><Target size={13} className="shrink-0 text-white/70" /><span className="truncate">{profile.target_role}</span></Link>}
            {limit != null && <span className="inline-flex items-center rounded-full bg-white/8 px-3 py-1 text-white/70 ring-1 ring-white/10"><b className="mr-1 text-white">₹{Math.max(0, limit - spent).toFixed(0)}</b> AI credit</span>}
          </div>

        </div>
        {gain > 0 && (
          <Link href={lift.href} className="group flex items-center justify-between gap-3 border-t border-white/10 bg-white/[.04] px-5 py-3 sm:px-7 transition hover:bg-white/[.08]">
            <span className="flex min-w-0 items-center gap-3"><span className="shrink-0 whitespace-nowrap rounded-full bg-clay px-2.5 py-0.5 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-white">Next step</span><span className="truncate font-semibold text-cream">{lift.lift}</span></span>
            <span className="pill-glass shrink-0">+{gain}%<span className="hidden sm:inline"> readiness</span> <ArrowRight size={15} /></span>
          </Link>
        )}
      </section>

      {/* ── Jobs + side ── */}
      {all.length === 0 ? (
        <Link href="/jobs/new" className="flex items-center gap-5 rounded-[22px] border-[1.5px] border-dashed border-clay/50 bg-card p-8 transition hover:border-clay fade-up">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-clay text-white"><Plus size={24} /></span>
          <span className="flex-1">
            <span className="block font-display text-[1.35rem] font-bold">Add the first job you want</span>
            <span className="block text-muted">Paste the description. We do the rest.</span>
          </span>
        </Link>
      ) : (
        <div>
          <section className="fade-up">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-[1.6rem] font-bold leading-none">Your jobs</h2>
              <Link href="/jobs" className="pill-nav">All {all.length} <ArrowRight size={14} /></Link>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 stagger">
              {live.slice(0, 5).map((a) => <JobTile key={a.id} a={a} practised={practised} />)}
              {live.length < 5 && (
                <Link href="/jobs/new" className="group card card-hover flex min-h-[190px] flex-col p-6">
                  <span data-tone="1" className="tone-chip grid h-11 w-11 place-items-center rounded-xl bg-line-2"><Plus size={20} /></span>
                  <span className="mt-4 block font-display text-[1.15rem] font-bold">Add another job</span>
                  <span className="block text-[0.86rem] text-muted">Aim for five or more.</span>
                  <span className="mt-auto pt-4"><span className="pill-action">Add a job <ArrowRight size={14} /></span></span>
                </Link>
              )}
              {live.length < 4 && (Math.min(live.length, 5) + 1) % 3 !== 0 && (
                <Link href="/interview" className="group card card-hover flex min-h-[190px] flex-col p-6">
                  <span className="flex items-start justify-between gap-3">
                    <span data-tone="2" className="tone-chip grid h-11 w-11 place-items-center rounded-xl bg-line-2"><Mic size={19} /></span>
                    <span className="rounded-full bg-good-soft px-2.5 py-0.5 text-[0.78rem] font-semibold text-good">{Math.min(interviews.length, 3)}/3 rounds</span>
                  </span>
                  <span className="mt-4 block font-display text-[1.15rem] font-bold">Mock interview</span>
                  <span className="block text-[0.86rem] text-muted">Practise while you wait{scores.length ? ` · last ${scores.at(-1)}/10` : ""}</span>
                  <span className="mt-3 grid grid-cols-3 gap-1.5">{[0, 1, 2].map((i) => <span key={i} className={`h-1.5 rounded-full ${i < interviews.length ? "bg-good" : "bg-line"}`} />)}</span>
                  <span className="mt-auto pt-4"><span className="pill-action">Start a round <ArrowRight size={14} /></span></span>
                </Link>
              )}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}

/** Ring made of the six score parts: each arc's length is its weight, the bright part is what you've earned. */
