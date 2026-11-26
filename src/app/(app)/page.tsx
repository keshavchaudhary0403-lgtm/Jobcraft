import Link from "next/link";
import { FileText, IndianRupee, Mic, Plus, ScanSearch, Send, Target } from "lucide-react";
import { LinkedInIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { JobsGrid } from "@/components/JobsGrid";
import { Playbook } from "@/components/Playbook";
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
  const talks = (sessions ?? []).filter((s) => s.kind === "negotiation");
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
  const word = score >= 75 ? "Interview-ready" : score >= 40 ? "Building momentum" : "Just getting started";

  // The prompt-PDF process, in order. Each step knows if it's done and where to do it.
  const job = live.find((x) => x.analysis) ?? live[0];
  const jobHref = (tab?: string) => (job ? `/jobs/${job.id}${tab ? `?tab=${tab}` : ""}` : "/jobs/new");
  const path = [
    { n: 1, icon: ScanSearch, title: "Decode the job", short: "Decode", sub: "What they really want", done: all.some((x) => x.analysis), href: job ? jobHref() : "/jobs/new" },
    { n: 2, icon: Target, title: "Honest fit", short: "Fit", sub: "Score, gaps, questions", done: all.some((x) => x.analysis && Object.values(x.fit_answers ?? {}).some((v) => String(v).trim())), href: jobHref() },
    { n: 3, icon: FileText, title: "Tailor resume", short: "Resume", sub: "Built for this job", done: all.some((x) => x.tailored_resume), href: jobHref("resume") },
    { n: 4, icon: LinkedInIcon, title: "LinkedIn", short: "LinkedIn", sub: "Found by recruiters", done: !!profile.linkedin_result, href: "/linkedin" },
    { n: 5, icon: Send, title: "Outreach", short: "Outreach", sub: "Note to the hiring manager", done: all.some((x) => x.outreach), href: jobHref("outreach") },
    { n: 6, icon: Mic, title: "Mock interview", short: "Interview", sub: "6 questions, scored", done: interviews.length > 0, href: "/interview" },
    { n: 7, icon: IndianRupee, title: "Salary talk", short: "Salary", sub: "Check and practise the offer", done: talks.length > 0, href: "/negotiation" },
  ];

  return (
    <div className="space-y-5">
      {/* ── Hero band ── */}
      <section className="dark-card hero-band flex flex-col justify-center overflow-hidden fade-up">
        <div className="p-6 sm:p-7">
          {/* Row 1: greeting and the readiness number share one baseline. */}
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="min-w-0 text-[1.85rem] font-bold leading-none text-white sm:text-[2.6rem]">{greeting()}{first ? `, ${first}` : ""}<span className="text-clay">.</span></h1>
            <Link href={lift.href} data-tip="How ready your job search is: resume, job match, prep, applications, mock interviews and LinkedIn" className="shrink-0 font-display text-[1.85rem] font-bold leading-none tabular-nums text-white sm:text-[2.6rem]">
              {score}<span className="ml-0.5 text-[0.55em] text-white/85">%</span>
            </Link>
          </div>
          {/* Row 2: context chips left, what the number means right - centred on one line. */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 flex-wrap gap-2 text-[0.84rem]">
              {profile.target_role && <Link href="/profile" className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/20"><Target size={13} className="shrink-0 text-white/85" /><span className="truncate">{profile.target_role}</span></Link>}
              {limit != null && <span className="inline-flex items-center rounded-full bg-white/8 px-3 py-1 text-white/85 ring-1 ring-white/10"><b className="mr-1 text-white">₹{Math.max(0, limit - spent).toFixed(0)}</b> AI credit</span>}
            </div>
            <Link href={lift.href} className="ml-auto shrink-0 text-right text-[0.84rem] text-white/85 hover:text-white">
              Search readiness<span className="hidden sm:inline"> · <b className="font-semibold text-white">{word}</b></span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Your hiring playbook: the seven prompt-PDF moves, explained one at a time ── */}
      <Playbook moves={path.map(({ n, title, done, href }) => ({ n, title, done, href }))} />

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
            <h2 className="mb-3 text-[1.6rem] font-bold leading-none">Your jobs</h2>
            {/* Same compact list as the Jobs page: latest 6, with a search across every live job. */}
            <JobsGrid jobs={live} practised={[...practised]} variant="home" limit={6} />
          </section>

        </div>
      )}
    </div>
  );
}

/** Ring made of the six score parts: each arc's length is its weight, the bright part is what you've earned. */
