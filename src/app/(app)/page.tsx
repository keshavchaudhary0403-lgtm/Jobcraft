import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, ClipboardPaste, IndianRupee, Mic, Plus, Send, Sparkles, Target } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { StatTile } from "@/components/ui";
import { JobCard } from "@/components/JobCard";
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
    { label: "Saved", n: by(["saved"]), cls: "bg-slate-300" },
    { label: "Applied", n: by(["applied"]), cls: "bg-blue-400" },
    { label: "Interviewing", n: by(["interviewing"]), cls: "bg-amber-400" },
    { label: "Offer", n: by(["offer"]), cls: "bg-green-600" },
  ];
  const spent = (usage ?? []).reduce((t, r) => t + Number(r.cost_usd), 0) * settings.usd_to_inr;
  const limit = profile.monthly_limit_inr ?? settings.default_monthly_limit_inr;
  const moves = nextMoves(list, !!profile.linkedin_result, practised);
  const first = profile.full_name?.split(" ")[0];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 fade-up">
        <div>
          <h1 className="text-[1.6rem] font-semibold leading-tight tracking-tight">{greeting()}{first ? `, ${first}` : ""}</h1>
          <p className="mt-0.5 text-muted">{profile.target_role ? `Going after ${profile.target_role}` : "Let's land your next role."}</p>
        </div>
        <Link href="/jobs/new" className="btn btn-primary"><Plus size={16} /> Add job</Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4 stagger">
        <StatTile icon={<BriefcaseBusiness size={18} />} label="Jobs tracked" value={list.length} sub={`${by(["saved"])} not applied yet`} />
        <StatTile icon={<Send size={18} />} label="Applied" value={by(["applied", "interviewing", "offer", "rejected"])} sub={`${by(["interviewing"])} interviewing`} />
        <StatTile icon={<Mic size={18} />} label="Interviews practised" value={interviews.length} sub="Mock rounds" />
        <StatTile icon={<Target size={18} />} label="Best match" value={best ? `${best.s * 10}%` : "—"} sub={best ? best.a.company : "Add a job to see"} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Your jobs</h2>
              {list.length > 0 && <Link href="/jobs" className="text-[0.9rem] text-muted hover:text-ink">View all</Link>}
            </div>
            {list.length === 0 ? (
              <Link href="/jobs/new" className="card card-hover ai-gradient flex items-center gap-4 p-6">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-navy text-white"><ClipboardPaste size={20} /></div>
                <div className="flex-1">
                  <div className="font-semibold">Paste a job description</div>
                  <div className="text-muted">Get your match, a tailored resume and outreach.</div>
                </div>
                <ArrowRight size={18} className="text-faint" />
              </Link>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3 stagger">
                {list.slice(0, 6).map((a) => <JobCard key={a.id} a={a} />)}
              </div>
            )}
          </section>

          {list.length > 0 && (
            <section className="card p-5 fade-up">
              <div className="mb-4 font-semibold">Your pipeline</div>
              <div className="grid grid-cols-4 gap-3">
                {pipeline.map((p) => (
                  <div key={p.label}>
                    <div className={`h-1.5 rounded-full ${p.n ? p.cls : "bg-line"}`} />
                    <div className="mt-2.5 text-[1.25rem] font-semibold tabular-nums">{p.n}</div>
                    <div className="text-[0.82rem] text-muted">{p.label}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 stagger">
          <div className="dark-card p-5">
            <div className="flex items-center gap-2 text-[0.85rem] text-teal-200"><Sparkles size={15} /> Jobcraft AI</div>
            <div className="mt-2 text-[1.15rem] font-semibold">Your next best move</div>
            <div className="mt-4 space-y-2">
              {moves.map((m) => (
                <Link key={m.label} href={m.href} className="flex items-center gap-3 rounded-xl bg-white/[.07] px-3.5 py-3 transition hover:bg-white/[.12]">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.92rem] font-medium">{m.label}</div>
                    <div className="text-[0.78rem] text-white/55">{m.sub}</div>
                  </div>
                  <ArrowRight size={15} className="shrink-0 text-white/50" />
                </Link>
              ))}
            </div>
          </div>

          <div className="card p-2">
            <Link href="/interview" className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand-ink"><Mic size={16} /></div>
              <div className="flex-1"><div className="font-medium">Mock interview</div><div className="text-[0.82rem] text-muted">By voice, honest score</div></div>
              <ArrowRight size={15} className="text-faint" />
            </Link>
            <Link href="/negotiation" className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-mid-soft text-mid"><IndianRupee size={16} /></div>
              <div className="flex-1"><div className="font-medium">Salary practice</div><div className="text-[0.82rem] text-muted">Check the offer, then negotiate</div></div>
              <ArrowRight size={15} className="text-faint" />
            </Link>
          </div>

          {limit != null && (
            <div className="card p-4">
              <div className="flex items-baseline justify-between text-[0.85rem]">
                <span className="font-medium">AI usage this month</span>
                <span className="tabular-nums text-muted">₹{spent.toFixed(spent < 10 ? 2 : 0)} / ₹{limit}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line-2">
                <div className={`h-full rounded-full ${spent / limit >= 0.9 ? "bg-bad" : "bg-brand"}`} style={{ width: `${Math.max(Math.min(100, (spent / limit) * 100), 2)}%` }} />
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
