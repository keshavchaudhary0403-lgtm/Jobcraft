import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, ClipboardPaste, Mic, Sparkles, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { CompanyAvatar, ScoreRing, StatusPill, timeAgo } from "@/components/ui";
import type { Application } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { createServiceClient } from "@/lib/supabase/server";
import { getSettings, monthStartIST } from "@/lib/ai";

function greeting() {
  const h = new Date(Date.now() + 5.5 * 3600e3).getUTCHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function Home() {
  const { supabase, profile } = await requireUser();
  const [{ data: apps }, { count: interviews }, settings, { data: usage }] = await Promise.all([
    supabase.from("applications").select("*").order("updated_at", { ascending: false }).returns<Application[]>(),
    supabase.from("sessions").select("id", { count: "exact", head: true }).eq("kind", "interview"),
    getSettings(createServiceClient()),
    supabase.from("usage_events").select("cost_usd").gte("created_at", monthStartIST()),
  ]);
  const list = apps ?? [];
  const scored = list.map((a) => (a.analysis as Analysis | null)?.fit_score).filter((n): n is number => typeof n === "number");
  const avg = scored.length ? Math.round((scored.reduce((x, y) => x + y, 0) / scored.length) * 10) / 10 : null;
  const applied = list.filter((a) => ["applied", "interviewing", "offer", "rejected"].includes(a.status)).length;
  const active = list.filter((a) => a.status === "interviewing").length;
  const spent = (usage ?? []).reduce((t, r) => t + Number(r.cost_usd), 0) * settings.usd_to_inr;
  const limit = profile.monthly_limit_inr ?? settings.default_monthly_limit_inr;
  const pct = limit ? Math.min(100, (spent / limit) * 100) : 0;
  const first = profile.full_name?.split(" ")[0];

  return (
    <>
      <div className="mb-8 fade-up">
        <h1 className="text-[1.75rem] font-semibold tracking-tight">{greeting()}{first ? `, ${first}` : ""}</h1>
        <p className="mt-1 text-muted">{profile.target_role ? `Going after: ${profile.target_role}` : "Let's land your next role."}</p>
      </div>

      <Link href="/jobs/new" className="group card card-hover ai-gradient mb-6 flex items-center gap-5 p-6 fade-up">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-navy text-white shadow-lg transition group-hover:scale-105">
          <ClipboardPaste size={24} />
        </div>
        <div className="flex-1">
          <div className="text-lg font-medium">Found a job you like?</div>
          <div className="text-sm text-muted">Paste the description — get your match, resume and outreach.</div>
        </div>
        <ArrowRight className="text-faint transition group-hover:translate-x-1 group-hover:text-ink" />
      </Link>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4 stagger">
        {[
          { label: "Jobs", value: list.length },
          { label: "Applied", value: applied },
          { label: "Interviewing", value: active },
          { label: "Avg. match", value: avg != null ? `${avg}/10` : "—" },
        ].map((s) => (
          <div key={s.label} className="card px-5 py-4">
            <div className="text-2xl font-semibold tracking-tight tabular-nums">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Recent jobs</h2>
            {list.length > 0 && <Link href="/jobs" className="text-sm text-muted hover:text-ink">View all</Link>}
          </div>
          {list.length === 0 ? (
            <div className="card flex flex-col items-center px-6 py-12 text-center">
              <BriefcaseBusiness className="text-faint" />
              <p className="mt-3 text-sm text-muted">Your jobs will show up here.</p>
            </div>
          ) : (
            <div className="card divide-y divide-line overflow-hidden stagger">
              {list.slice(0, 6).map((a) => {
                const an = a.analysis as Analysis | null;
                return (
                  <Link key={a.id} href={`/jobs/${a.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50">
                    <CompanyAvatar name={a.company} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{a.role}</div>
                      <div className="truncate text-xs text-muted">{a.company} · {timeAgo(a.updated_at)}</div>
                    </div>
                    <StatusPill status={a.status} />
                    {an && <ScoreRing score={an.fit_score} size={38} stroke={4} />}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-4 stagger">
          <Link href="/interview" className="card card-hover flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand-ink"><Mic size={18} /></div>
            <div className="flex-1">
              <div className="text-sm font-medium">Practise an interview</div>
              <div className="text-xs text-muted">{interviews ? `${interviews} done so far` : "By voice, 6 questions"}</div>
            </div>
          </Link>
          <Link href="/linkedin" className="card card-hover flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Sparkles size={18} /></div>
            <div className="flex-1">
              <div className="text-sm font-medium">Polish your LinkedIn</div>
              <div className="text-xs text-muted">Headlines recruiters search for</div>
            </div>
          </Link>
          <Link href="/profile" className="card card-hover flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><UserRound size={18} /></div>
            <div className="flex-1">
              <div className="text-sm font-medium">My profile</div>
              <div className="text-xs text-muted">Resume and details</div>
            </div>
          </Link>
          {limit != null && (
            <div className="card p-4">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-slate-700">AI usage this month</span>
                <span className="tabular-nums text-muted">₹{spent.toFixed(spent < 10 ? 2 : 0)} / ₹{limit}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${pct >= 90 ? "bg-bad" : "bg-brand"}`} style={{ width: `${Math.max(pct, 2)}%` }} />
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
