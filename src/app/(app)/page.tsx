import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, IndianRupee, Mic, Plus, Send, Target, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { profileStrength } from "@/components/ui";
import { JobTile, STATUS_BAR, StatusDonut } from "@/components/JobTiles";
import { STATUSES, type Application, type Status } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { createServiceClient } from "@/lib/supabase/server";
import { getSettings, monthStartIST } from "@/lib/ai";
import { resumeHealth } from "@/lib/resume-health";
import { journey, openQs } from "@/lib/journey";

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
    { label: "Resume", color: "var(--mustard)", value: (health ?? 0) / 100, weight: 20, lift: "Strengthen your resume", href: "/profile" },
    { label: "Match", color: "var(--brand-2)", value: (avg ?? 0) / 100, weight: 20, lift: "Add jobs that fit you better", href: "/jobs/new" },
    { label: "Prep", color: "color-mix(in srgb, var(--clay) 70%, white)", value: saved.length ? prepDone / (saved.length * 4) : all.length ? 1 : 0, weight: 15, lift: "Finish prepping saved jobs", href: "/jobs" },
    { label: "Applying", color: "var(--brand-2)", value: Math.min(thisWeek / GOAL, 1), weight: 20, lift: thisWeek ? "Apply to more this week" : "Send your first application", href: "/jobs" },
    { label: "Interview", color: "var(--clay-2)", value: Math.min(interviews.length / 3, 1), weight: 15, lift: "Do a mock interview", href: "/interview" },
    { label: "LinkedIn", color: "#ffffff", value: profile.linkedin_result ? 1 : 0, weight: 10, lift: "Rewrite your LinkedIn", href: "/linkedin" },
  ];
  const score = Math.round(parts.reduce((t, p) => t + p.weight * p.value, 0));
  const lift = [...parts].sort((x, y) => y.weight * (1 - y.value) - x.weight * (1 - x.value))[0];
  const gain = Math.round(lift.weight * (1 - lift.value));
  const word = score >= 75 ? "Interview-ready" : score >= 50 ? "Picking up pace" : "Warming up";

  // Areas of the platform with live status
  const qOpen = live.reduce((t, a) => t + openQs(a), 0);
  const offers = live.filter((a) => a.status === "offer").length;
  const areas = [
    { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness, hint: live.length ? `${live.length} active${qOpen ? ` · ${qOpen} questions open` : ""}` : "Add your first" },
    { href: "/linkedin", label: "LinkedIn", icon: Send, hint: profile.linkedin_result ? "Rewritten" : "Not rewritten yet" },
    { href: "/interview", label: "Interview", icon: Mic, hint: `${Math.min(interviews.length, 3)}/3 rounds${scores.length ? ` · last ${scores.at(-1)}/10` : ""}` },
    { href: "/negotiation", label: "Salary", icon: IndianRupee, hint: offers ? `${offers} offer${offers > 1 ? "s" : ""}` : `${negotiations.length} talk${negotiations.length === 1 ? "" : "s"} practised` },
    { href: "/profile", label: "Profile", icon: UserRound, hint: `${strength}% complete${health != null ? ` · resume ${health}` : ""}` },
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
        <div className="grid gap-6 p-7 lg:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1.2fr)] lg:items-center">
          <div>
            <div className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-white/50">Your job search</div>
            <h1 className="mt-2 text-[2.9rem] font-bold leading-[0.95] text-cream">{greeting()}{first ? `, ${first}` : ""}<span className="text-clay">.</span></h1>
            {profile.target_role && <p className="mt-3 text-white/65">Chasing <span className="font-semibold text-cream">{profile.target_role}</span></p>}
          </div>

          <Link href={lift.href} className="flex items-center gap-4" title="Your search score">
            <ScoreRing value={score} parts={parts} />
            <div>
              <div className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-white/50">Search score</div>
              <div className="font-display text-[1.25rem] font-bold text-brand-2">{word}</div>
            </div>
          </Link>

          <div className="grid grid-cols-3 gap-3">
            <Link href="/jobs" data-tone="0" className="stat-tile rounded-2xl bg-white/[.07] p-4 transition hover:bg-white/[.12]">
              <div className="text-[0.8rem] text-white/55">This week</div>
              <div className="font-display text-[1.7rem] font-bold leading-tight tabular-nums">{thisWeek}<span className="text-[0.9rem] text-white/45">/{GOAL}</span></div>
              <div className="mt-2 flex gap-1">{week.map((d) => <span key={d.key} title={`${d.n} applied`} className={`h-1.5 flex-1 rounded-full ${d.n ? "bg-clay" : "bg-white/15"}`} />)}</div>
            </Link>
            <Link href="/interview" data-tone="1" className="stat-tile rounded-2xl bg-white/[.07] p-4 transition hover:bg-white/[.12]">
              <div className="text-[0.8rem] text-white/55">Mock rounds</div>
              <div className="font-display text-[1.7rem] font-bold leading-tight tabular-nums">{Math.min(interviews.length, 3)}<span className="text-[0.9rem] text-white/45">/3</span></div>
              <div className="mt-2 flex gap-1">{[0, 1, 2].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < interviews.length ? "bg-clay-2" : "bg-white/15"}`} />)}</div>
            </Link>
            <Link href="/profile" data-tone="3" className="stat-tile rounded-2xl bg-white/[.07] p-4 transition hover:bg-white/[.12]">
              <div className="text-[0.8rem] text-white/55">AI left</div>
              <div className="font-display text-[1.7rem] font-bold leading-tight tabular-nums">₹{limit != null ? Math.max(0, limit - spent).toFixed(0) : "-"}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-mustard" style={{ width: `${limit ? Math.max(2, Math.min(100, 100 - (spent / limit) * 100)) : 0}%` }} /></div>
            </Link>
          </div>
        </div>
        {gain > 0 && (
          <Link href={lift.href} className="flex items-center justify-between gap-3 border-t border-white/10 bg-white/[.04] px-5 py-3.5 sm:px-7 transition hover:bg-white/[.08]">
            <span className="flex min-w-0 items-center gap-3"><span className="shrink-0 whitespace-nowrap rounded-full bg-clay px-2.5 py-0.5 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-white">Biggest lift</span><span className="truncate font-semibold text-cream">{lift.lift}</span></span>
            <span className="flex shrink-0 items-center gap-2 whitespace-nowrap font-display text-[1.1rem] font-bold text-mustard">+{gain}<span className="hidden sm:inline"> points</span> <ArrowRight size={16} /></span>
          </Link>
        )}
      </section>

      {/* ── Areas ── */}
      <nav className="thin-scroll -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 fade-up sm:mx-0 sm:px-0 md:grid md:grid-cols-5 md:overflow-visible md:pb-0">
        {areas.map((x, i) => (
          <Link key={x.href} href={x.href} className="group flex min-w-[220px] shrink-0 items-center gap-3 rounded-[20px] border-[1.5px] border-line bg-card px-4 py-3.5 transition hover:border-brand/40 hover:bg-white md:min-w-0">
            <span data-tone={i % 5} className="tone-chip grid h-10 w-10 shrink-0 place-items-center rounded-full bg-line-2 text-brand transition group-hover:bg-side group-hover:text-cream"><x.icon size={17} /></span>
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
            <span className="block text-muted">Paste the description - Jobcraft decodes it, scores your fit, tailors your resume and writes to the hiring manager.</span>
          </span>
        </Link>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <section className="fade-up">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-[1.6rem] font-bold leading-none">Your jobs</h2>
              <Link href="/jobs" className="inline-flex items-center gap-1 text-[0.92rem] font-semibold text-brand hover:underline">All {all.length} <ArrowRight size={14} /></Link>
            </div>
            <div className="grid gap-5 md:grid-cols-2 stagger">
              {live.slice(0, 4).map((a) => <JobTile key={a.id} a={a} practised={practised} />)}
              {live.length < 4 && (
                <Link href="/jobs/new" className="flex min-h-[190px] flex-col items-center justify-center gap-3 rounded-[22px] border-[1.5px] border-dashed border-line text-center text-muted transition hover:border-clay hover:text-clay">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-line-2"><Plus size={20} /></span>
                  <span>
                    <span className="block font-display text-[1.15rem] font-bold text-ink">Add another job</span>
                    <span className="block text-[0.84rem]">Five or more keeps your search moving.</span>
                  </span>
                </Link>
              )}
              {live.length < 4 && live.length % 2 === 0 && (
                <Link href="/interview" className="card card-hover flex min-h-[190px] flex-col justify-between p-5" style={{ background: "var(--color-plum-soft)" }}>
                  <span className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-plum text-white"><Mic size={19} /></span>
                    <span>
                      <span className="block text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-plum">Practise while you wait</span>
                      <span className="block font-display text-[1.15rem] font-bold">Mock interview</span>
                    </span>
                  </span>
                  <span className="grid grid-cols-3 gap-1.5">{[0, 1, 2].map((i) => <span key={i} className={`h-2 rounded-full ${i < interviews.length ? "bg-plum" : "bg-white"}`} />)}</span>
                  <span className="flex items-center justify-between text-[0.88rem]">
                    <span className="text-muted">{Math.min(interviews.length, 3)} of 3 rounds{scores.length ? ` · last ${scores.at(-1)}/10` : ""}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-plum">Start <ArrowRight size={14} /></span>
                  </span>
                </Link>
              )}
            </div>
          </section>

          <aside className="space-y-5 xl:pt-[2.35rem] fade-up">
            <section className="card p-5">
              <div className="text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-muted">Pipeline</div>
              <div className="mt-1 flex items-center gap-5">
                <div className="-mt-3 shrink-0"><StatusDonut counts={counts} total={all.length} size={110} /></div>
                <ul className="min-w-0 flex-1 space-y-1.5 text-[0.88rem]">
                  {STATUSES.filter((s) => counts[s]).map((s) => (
                    <li key={s}><Link href={`/jobs?status=${s}`} className="flex items-center gap-2 hover:text-brand"><span className={`h-2 w-2 rounded-full ${STATUS_BAR[s]}`} /><span className="flex-1 capitalize">{s}</span><b className="tabular-nums">{counts[s]}</b></Link></li>
                  ))}
                </ul>
              </div>
            </section>

            {gaps.length > 0 && (
              <section className="card p-5" style={{ background: "var(--color-mustard-soft)" }}>
                <div className="flex items-center gap-2 text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-mustard-ink"><Target size={14} /> Gaps across your jobs</div>
                <ul className="mt-3 space-y-2.5">
                  {gaps.map(([g, v]) => (
                    <li key={g} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-6 min-w-6 place-items-center rounded-full bg-clay px-1 text-[0.78rem] font-bold text-white">{v.n}×</span>
                      <span className="text-[0.9rem] font-medium leading-snug">{g}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/profile" className="mt-4 inline-flex items-center gap-1 text-[0.88rem] font-semibold text-clay hover:underline">Close them in your resume <ArrowRight size={14} /></Link>
              </section>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

/** Ring made of the six score parts: each arc's length is its weight, the bright part is what you've earned. */
function ScoreRing({ value, parts }: { value: number; parts: { label: string; color: string; value: number; weight: number }[] }) {
  const size = 128, stroke = 12, r = (size - stroke) / 2, c = 2 * Math.PI * r, gap = 4;
  const segs = parts.map((p, i) => ({ ...p, start: (parts.slice(0, i).reduce((t, x) => t + x.weight, 0) / 100) * c, len: (p.weight / 100) * c }));
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {segs.map((p) => (
          <g key={p.label}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={stroke} strokeDasharray={`${p.len - gap} ${c}`} strokeDashoffset={-p.start} />
            {p.value > 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={stroke} strokeDasharray={`${Math.max((p.len - gap) * p.value, 1)} ${c}`} strokeDashoffset={-p.start}><title>{p.label}</title></circle>}
          </g>
        ))}
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-[2.4rem] font-bold leading-none tabular-nums text-cream">{value}</div>
        <div className="text-[0.78rem] text-white/45">of 100</div>
      </div>
    </div>
  );
}
