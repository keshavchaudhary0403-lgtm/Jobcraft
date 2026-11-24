import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, IndianRupee, Mic, Plus, Send, Target, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { STATUS_META, profileStrength } from "@/components/ui";
import { JobTile, STATUS_BAR, StatusBar } from "@/components/JobTiles";
import { STATUSES, type Application, type Status } from "@/lib/types";
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
  const negotiations = (sessions ?? []).filter((s) => s.kind === "negotiation");
  const practised = new Set(interviews.map((s) => s.application_id).filter(Boolean) as string[]);
  const scores = interviews.map((s) => (s.meta as { interview_report?: { score?: number } } | null)?.interview_report?.score).filter((x): x is number => typeof x === "number");
  const spent = (usage ?? []).reduce((t, r) => t + Number(r.cost_usd), 0) * settings.usd_to_inr;
  const limit = profile.monthly_limit_inr ?? settings.default_monthly_limit_inr;
  const first = profile.full_name?.split(" ")[0];
  const health = profile.master_resume?.trim() ? resumeHealth(profile.master_resume).score : null;
  const strength = profileStrength(profile);

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

  // Areas of the platform with live status
  const offers = live.filter((a) => a.status === "offer").length;
  const areas = [
    { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness, hint: live.length ? `${live.length} active` : "Add your first" },
    { href: "/linkedin", label: "LinkedIn", icon: Send, hint: profile.linkedin_result ? "Rewritten" : "Not done yet" },
    { href: "/interview", label: "Interview", icon: Mic, hint: `${Math.min(interviews.length, 3)}/3 rounds` },
    { href: "/negotiation", label: "Salary", icon: IndianRupee, hint: offers ? `${offers} offer${offers > 1 ? "s" : ""}` : `${negotiations.length} practised` },
    { href: "/profile", label: "Profile", icon: UserRound, hint: `${strength}% complete` },
  ];

  // Gaps that repeat across jobs
  const gapMap = new Map<string, { n: number; status: string }>();
  for (const a of live) for (const g of (a.analysis as Analysis | null)?.gaps ?? []) {
    const k = g.gap.trim();
    gapMap.set(k, { n: (gapMap.get(k)?.n ?? 0) + 1, status: g.status });
  }
  const gaps = [...gapMap.entries()].sort((x, y) => y[1].n - x[1].n).slice(0, 4);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, all.filter((a) => a.status === s).length])) as Record<Status, number>;

  return (
    <div className="space-y-5">
      {/* ── Hero band ── */}
      <section className="dark-card overflow-hidden fade-up">
        <div className="p-6 sm:p-7">
          {/* Top row: greeting on the left, readiness on the right */}
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <h1 className="text-[2.3rem] font-bold leading-[0.95] text-white sm:text-[2.6rem]">{greeting()}{first ? `, ${first}` : ""}<span className="text-clay">.</span></h1>
              <div className="mt-3 flex flex-wrap gap-2 text-[0.84rem]">
                {profile.target_role && <Link href="/profile" title="Your target role" className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-white/12 px-3 py-1 font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/20"><Target size={13} className="shrink-0 text-white/70" /><span className="truncate">{profile.target_role}</span></Link>}
                {limit != null && <span title="AI credit left this month" className="inline-flex items-center rounded-full bg-white/8 px-3 py-1 text-white/70 ring-1 ring-white/10"><b className="mr-1 text-white">₹{Math.max(0, limit - spent).toFixed(0)}</b> AI credit</span>}
              </div>
            </div>
            <Link href={lift.href} title="Job-search readiness, made up of the six parts below" className="sm:text-right">
              <span className="block font-display text-[2.6rem] font-bold leading-none tabular-nums text-white">{score}<span className="text-[1.3rem] text-white/70">%</span></span>
              <span className="mt-1 block text-[0.84rem] text-white/65">ready · {word}</span>
            </Link>
          </div>

          {/* Six parts, as glass tiles */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
            {parts.map((p, i) => (
              <Link key={p.label} href={p.href} data-tone={[0, 1, 3][i % 3]} className="stat-tile rounded-2xl px-3.5 pb-3 pt-3.5 transition hover:bg-white/[.14]">
                <span className="block truncate text-[0.78rem] text-white/60">{p.label}</span>
                <span className="mt-0.5 block truncate font-display text-[1.1rem] font-bold tabular-nums text-white">{p.show}</span>
                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full" style={{ width: `${Math.max(p.value * 100, p.value > 0 ? 4 : 0)}%`, background: p.value >= 1 ? "#5fd99a" : "var(--hero-accent)" }} /></span>
              </Link>
            ))}
          </div>
        </div>
        {gain > 0 && (
          <Link href={lift.href} className="group flex items-center justify-between gap-3 border-t border-white/10 bg-white/[.04] px-5 py-3 sm:px-7 transition hover:bg-white/[.08]">
            <span className="flex min-w-0 items-center gap-3"><span className="shrink-0 whitespace-nowrap rounded-full bg-clay px-2.5 py-0.5 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-white">Next step</span><span className="truncate font-semibold text-cream">{lift.lift}</span></span>
            <span className="pill-glass shrink-0">+{gain}%<span className="hidden sm:inline"> readiness</span> <ArrowRight size={15} /></span>
          </Link>
        )}
      </section>

      {/* ── Areas ── */}
      <nav className="thin-scroll -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 fade-up sm:mx-0 sm:px-0 md:grid md:grid-cols-5 md:overflow-visible md:pb-0">
        {areas.map((x, i) => (
          <Link key={x.href} href={x.href} className="group flex min-w-[220px] shrink-0 items-center gap-3 rounded-[20px] border-[1.5px] border-line bg-card px-4 py-3.5 transition hover:border-brand/40 hover:bg-white md:min-w-0">
            <span data-tone={i % 5} className="tone-chip grid h-10 w-10 shrink-0 place-items-center rounded-full bg-line-2 text-brand transition group-hover:scale-105"><x.icon size={17} /></span>
            <span className="min-w-0">
              <span className="block font-display text-[1.05rem] font-bold leading-tight"><span className="text-faint">0{i + 1} </span>{x.label}</span>
              <span className="block truncate text-[0.78rem] text-muted">{x.hint}</span>
            </span>
          </Link>
        ))}
      </nav>

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
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <section className="fade-up">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-[1.6rem] font-bold leading-none">Your jobs</h2>
              <Link href="/jobs" className="pill-nav">All {all.length} <ArrowRight size={14} /></Link>
            </div>
            <div className="grid gap-5 md:grid-cols-2 stagger">
              {live.slice(0, 4).map((a) => <JobTile key={a.id} a={a} practised={practised} />)}
              {live.length < 4 && (
                <Link href="/jobs/new" className="group card card-hover flex min-h-[190px] flex-col p-6">
                  <span data-tone="1" className="tone-chip grid h-11 w-11 place-items-center rounded-xl bg-line-2"><Plus size={20} /></span>
                  <span className="mt-4 block font-display text-[1.15rem] font-bold">Add another job</span>
                  <span className="block text-[0.86rem] text-muted">Aim for five or more.</span>
                  <span className="mt-auto pt-4"><span className="pill-action">Add a job <ArrowRight size={14} /></span></span>
                </Link>
              )}
              {live.length < 4 && live.length % 2 === 0 && (
                <Link href="/interview" className="group card card-hover flex min-h-[190px] flex-col p-6">
                  <span className="flex items-start justify-between gap-3">
                    <span data-tone="2" className="tone-chip grid h-11 w-11 place-items-center rounded-xl bg-line-2"><Mic size={19} /></span>
                    <span className="rounded-full bg-good-soft px-2.5 py-0.5 text-[0.78rem] font-semibold text-good">{Math.min(interviews.length, 3)}/3 rounds</span>
                  </span>
                  <span className="mt-4 block font-display text-[1.15rem] font-bold">Mock interview</span>
                  <span className="block text-[0.86rem] text-muted">Practise while you wait{scores.length ? ` · last ${scores.at(-1)}/10` : ""}</span>
                  <span className="mt-3 grid grid-cols-3 gap-1.5">{[0, 1, 2].map((i) => <span key={i} className={`h-1.5 rounded-full ${i < interviews.length ? "bg-good" : "bg-line-2"}`} />)}</span>
                  <span className="mt-auto pt-4"><span className="pill-action">Start a round <ArrowRight size={14} /></span></span>
                </Link>
              )}
            </div>
          </section>

          <aside className="space-y-5 xl:pt-[2.35rem] fade-up">
            <section className="card p-5">
              <div className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-muted">Pipeline</div>
              <div className="mt-2 flex items-baseline gap-2"><span className="font-display text-[1.8rem] font-bold leading-none">{all.length}</span><span className="text-[0.86rem] text-muted">job{all.length === 1 ? "" : "s"}</span></div>
              <div className="mt-3"><StatusBar counts={counts} total={all.length} /></div>
              <ul className="mt-3 space-y-1.5 text-[0.88rem]">
                {STATUSES.filter((s) => counts[s]).map((s) => (
                  <li key={s}><Link href={`/jobs?status=${s}`} className="flex items-center gap-2 hover:text-brand"><span className={`h-2 w-2 rounded-full ${STATUS_BAR[s]}`} /><span className="flex-1">{STATUS_META[s].label}</span><b className="tabular-nums">{counts[s]}</b></Link></li>
                ))}
              </ul>
            </section>

            {gaps.length > 0 && (
              <section className="card p-5">
                <div className="flex items-center gap-2 text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-mustard-ink"><Target size={14} /> Gaps across your jobs</div>
                <ul className="mt-3 space-y-2.5">
                  {gaps.map(([g, v]) => (
                    <li key={g} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-6 min-w-6 place-items-center rounded-full bg-brand px-1 text-[0.78rem] font-bold text-white">{v.n}×</span>
                      <span className="text-[0.9rem] font-medium leading-snug">{g}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/profile" className="pill-action mt-4">Close them in your resume <ArrowRight size={14} /></Link>
              </section>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

/** Ring made of the six score parts: each arc's length is its weight, the bright part is what you've earned. */
