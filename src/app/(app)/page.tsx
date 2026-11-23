import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, ChevronRight, ClipboardPaste, FileText, IndianRupee, UserRound, Mic, Plus, Send, Sparkles, Target } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Kpi } from "@/components/ui";
import { JobTable } from "@/components/JobTable";
import { resumeHealth } from "@/lib/resume-health";
import type { Application } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { createServiceClient } from "@/lib/supabase/server";
import { getSettings, monthStartIST } from "@/lib/ai";

function greeting() {
  const h = new Date(Date.now() + 5.5 * 3600e3).getUTCHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

type Move = { href: string; label: string; sub: string };

function nextMoves(apps: Application[], hasLinkedIn: boolean, practised: Set<string>): Move[] {
  const moves: Move[] = [];
  for (const a of apps) {
    const an = a.analysis as Analysis | null;
    const unanswered = an ? an.questions.filter((q) => !a.fit_answers?.[q]?.trim()).length : 0;
    if (!an) moves.push({ href: `/jobs/${a.id}`, label: `See your match for ${a.company}`, sub: "Takes about 15 seconds" });
    else if (unanswered) moves.push({ href: `/jobs/${a.id}`, label: `Answer ${unanswered} question${unanswered > 1 ? "s" : ""} for ${a.company}`, sub: "Sharpens your match score" });
    else if (!a.tailored_resume) moves.push({ href: `/jobs/${a.id}?tab=resume`, label: `Tailor your resume for ${a.company}`, sub: `${an.fit_score * 10}% match today` });
    else if (!a.outreach) moves.push({ href: `/jobs/${a.id}?tab=outreach`, label: `Message the hiring manager at ${a.company}`, sub: "Connection note + message" });
    else if (["applied", "interviewing"].includes(a.status) && !practised.has(a.id)) moves.push({ href: `/jobs/${a.id}?tab=practice`, label: `Practise your ${a.company} interview`, sub: "6 questions, by voice" });
    if (moves.length >= 3) break;
  }
  if (moves.length < 3 && !hasLinkedIn) moves.push({ href: "/linkedin", label: "Refresh your LinkedIn", sub: "Headlines recruiters search for" });
  if (!apps.length) moves.unshift({ href: "/jobs/new", label: "Add your first job", sub: "Paste any job description" });
  return moves.slice(0, 3);
}

export default async function Home() {
  const { supabase, profile } = await requireUser();
  const [{ data: apps }, { data: sessions }, settings, { data: usage }] = await Promise.all([
    supabase.from("applications").select("*").order("updated_at", { ascending: false }).returns<Application[]>(),
    supabase.from("sessions").select("application_id, kind").in("kind", ["interview", "negotiation"]),
    getSettings(createServiceClient()),
    supabase.from("usage_events").select("cost_usd").gte("created_at", monthStartIST()),
  ]);
  const list = apps ?? [];
  const interviews = (sessions ?? []).filter((s) => s.kind === "interview");
  const practised = new Set(interviews.map((s) => s.application_id).filter(Boolean) as string[]);
  const scored = list.filter((a) => a.analysis).map((a) => ({ a, s: (a.analysis as Analysis).fit_score }));
  const best = scored.sort((x, y) => y.s - x.s)[0];
  const by = (st: string[]) => list.filter((a) => st.includes(a.status)).length;
  const pipeline = [
    { key: "saved", label: "Saved", n: by(["saved"]), cls: "bg-[#d6d0ea]" },
    { key: "applied", label: "Applied", n: by(["applied"]), cls: "bg-[#b9a6f2]" },
    { key: "interviewing", label: "Interviewing", n: by(["interviewing"]), cls: "bg-[#8a6fe0]" },
    { key: "offer", label: "Offer", n: by(["offer"]), cls: "bg-brand" },
  ];
  const appliedCount = by(["applied", "interviewing", "offer", "rejected"]);
  const spent = (usage ?? []).reduce((t, r) => t + Number(r.cost_usd), 0) * settings.usd_to_inr;
  const limit = profile.monthly_limit_inr ?? settings.default_monthly_limit_inr;
  const moves = nextMoves(list, !!profile.linkedin_result, practised);
  const first = profile.full_name?.split(" ")[0];

  const health = profile.master_resume?.trim() ? resumeHealth(profile.master_resume).score : null;
  const [top, ...rest] = moves;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 fade-up">
        <div>
          <h1 className="text-[1.6rem] font-semibold leading-tight tracking-tight">{greeting()}{first ? `, ${first}` : ""}</h1>
          <p className="mt-0.5 text-muted">{profile.target_role ? `Going after ${profile.target_role}` : "Let's land your next role."}</p>
        </div>
        <Link href="/jobs/new" className="btn btn-primary"><Plus size={16} /> Add job</Link>
      </div>

      {/* Next move + readiness */}
      <div className="mb-6 grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="dark-card relative overflow-hidden p-6 fade-up">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-2/20 blur-3xl" />
          <div className="relative flex items-center gap-2 text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-white/60"><Sparkles size={14} /> Your next move</div>
          {top ? (
            <>
              <div className="relative mt-2 text-[1.45rem] font-semibold leading-snug">{top.label}</div>
              <div className="relative text-white/70">{top.sub}</div>
              <Link href={top.href} className="btn relative mt-5 bg-white text-brand-ink hover:bg-white/90">Do it now <ArrowRight size={15} /></Link>
              {rest.length > 0 && (
                <div className="relative mt-6 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-2">
                  {rest.map((m) => (
                    <Link key={m.href + m.label} href={m.href} className="group flex items-center gap-3 rounded-xl bg-white/[.06] px-3.5 py-2.5 transition hover:bg-white/[.12]">
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-[0.9rem] font-medium">{m.label}</div>
                        <div className="text-[0.76rem] text-white/60">{m.sub}</div>
                      </div>
                      <ArrowRight size={14} className="shrink-0 text-white/50 transition group-hover:translate-x-0.5" />
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="relative mt-2 text-[1.2rem] font-semibold">You&apos;re all caught up.</div>
          )}
        </section>

        <section className="card flex flex-col p-5 fade-up">
          <div className="mb-3 font-bold">Your readiness</div>
          <div className="flex flex-1 flex-col justify-around divide-y divide-line">
            {[
              { href: "/profile", icon: <FileText size={15} />, label: "Resume health", value: health != null ? `${health}/100` : "Add resume", pct: health ?? 0 },
              { href: "/linkedin", icon: <UserRound size={15} />, label: "LinkedIn rewrite", value: profile.linkedin_result ? "Done" : "Not yet", pct: profile.linkedin_result ? 100 : 0 },
              { href: "/interview", icon: <Mic size={15} />, label: "Interview practice", value: `${Math.min(interviews.length, 3)} of 3 rounds`, pct: (Math.min(interviews.length, 3) / 3) * 100 },
            ].map((r) => (
              <Link key={r.label} href={r.href} className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-line-2/60">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">{r.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[0.92rem] font-medium">{r.label}</span>
                    <span className="text-[0.84rem] text-muted">{r.value}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line-2"><div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${Math.max(r.pct, 2)}%` }} /></div>
                </div>
                <ChevronRight size={15} className="shrink-0 text-faint transition group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Key numbers */}
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4 stagger">
        <Kpi href="/jobs" icon={<BriefcaseBusiness size={16} />} label="Jobs tracked" value={list.length} breakdown={pipeline.map((p) => ({ label: p.label.toLowerCase(), n: p.n, cls: p.cls }))} />
        <Kpi
          href="/jobs?view=board"
          tone="sun"
          icon={<Send size={16} />}
          label="Applied"
          value={appliedCount}
          unit={list.length ? `of ${list.length}` : undefined}
          progress={list.length ? { value: appliedCount, max: list.length, caption: appliedCount ? `${by(["interviewing", "offer"])} moved to interviews or offers` : "Apply to your best matches first" } : undefined}
        />
        <Kpi
          href="/interview"
          tone="lilac"
          icon={<Mic size={16} />}
          label="Interviews practised"
          value={interviews.length}
          progress={{ value: Math.min(interviews.length, 3), max: 3, caption: interviews.length >= 3 ? "Goal reached — keep it sharp" : `${3 - interviews.length} more to reach 3 rounds` }}
        />
        <Kpi
          href={best ? `/jobs/${best.a.id}` : "/jobs/new"}
          tone="rose"
          icon={<Target size={16} />}
          label="Best match"
          value={best ? best.s * 10 : "—"}
          unit={best ? "%" : undefined}
          progress={best ? { value: best.s, max: 10, caption: best.a.company } : undefined}
          note={best ? undefined : "Add a job to see your match"}
        />
      </div>

      {/* Jobs list */}
      <section className="card mb-6 overflow-hidden fade-up">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="font-bold">Your jobs</div>
          {list.length > 0 && (
            <div className="flex gap-2">
              <Link href="/jobs?view=board" className="pill-link">Board <ArrowRight size={12} /></Link>
              <Link href="/jobs" className="pill-link">View all <ArrowRight size={12} /></Link>
            </div>
          )}
        </div>
        {list.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <ClipboardPaste size={22} className="text-brand-2" />
            <div className="mt-3 font-semibold">No jobs yet</div>
            <p className="mt-1 max-w-sm text-[0.9rem] text-muted">Paste a job description or a link — you&apos;ll get your match, a tailored resume and outreach.</p>
            <Link href="/jobs/new" className="btn btn-primary mt-4"><Plus size={15} /> Add your first job</Link>
          </div>
        ) : (
          <JobTable apps={list.slice(0, 6)} practised={practised} />
        )}
      </section>

      {/* Practice + usage */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { href: "/interview", icon: <Mic size={17} />, title: "Mock interview", sub: "By voice, honest score" },
          { href: "/negotiation", icon: <IndianRupee size={17} />, title: "Salary practice", sub: "Check the offer, then negotiate" },
          { href: "/linkedin", icon: <UserRound size={17} />, title: "LinkedIn", sub: "Headlines recruiters search" },
        ].map((t) => (
          <Link key={t.href} href={t.href} className="card card-hover group flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">{t.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t.title}</span>
              <span className="block text-[0.82rem] text-muted">{t.sub}</span>
            </span>
            <ArrowRight size={15} className="text-faint transition group-hover:translate-x-0.5" />
          </Link>
        ))}
        <div className="card p-4">
          <div className="flex items-center justify-between text-[0.88rem]">
            <span className="font-semibold">AI usage this month</span>
            <span className="tabular-nums text-muted">₹{spent.toFixed(spent < 10 ? 2 : 0)}{limit != null ? ` / ₹${limit}` : ""}</span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line-2">
            <div className="h-full rounded-full bg-brand" style={{ width: `${limit ? Math.min(100, Math.max(2, (spent / limit) * 100)) : 2}%` }} />
          </div>
          <div className="mt-1.5 text-[0.76rem] text-muted">Your monthly AI limit · resets on the 1st</div>
        </div>
      </div>
    </>
  );
}
