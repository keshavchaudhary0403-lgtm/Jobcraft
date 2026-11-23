"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronRight,
  ExternalLink,
  FileText,
  MapPin,
  MessageCircle,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STATUSES, type Application, type Message, type Session, type Status } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { CompanyAvatar, MatchChip, STATUS_META, StatusPill } from "@/components/ui";
import { Menu, Modal } from "@/components/client-ui";
import { ChatPanel } from "@/components/ChatPanel";
import { Overview } from "./Overview";
import { ResumeTab } from "./ResumeTab";
import { OutreachTab } from "./OutreachTab";
import { PracticeTab } from "./PracticeTab";

const TABS = [
  { key: "overview", label: "Match" },
  { key: "resume", label: "Resume" },
  { key: "outreach", label: "Outreach" },
  { key: "practice", label: "Practice" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

export function JobView({
  app: initial,
  coachSessionId,
  coachMessages,
  interviews,
  initialTab,
}: {
  app: Application;
  coachSessionId: string;
  coachMessages: Message[];
  interviews: Session[];
  initialTab?: string;
}) {
  const router = useRouter();
  const [app, setApp] = useState(initial);
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.key === initialTab) && initial.analysis ? (initialTab as Tab) : "overview");
  const [coach, setCoach] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showJd, setShowJd] = useState(false);
  const a = app.analysis as Analysis | null;
  const analysed = !!a;
  const patchLocal = (p: Partial<Application>) => setApp((x) => ({ ...x, ...p }));

  async function update(patch: Partial<Application>) {
    patchLocal(patch);
    await createClient().from("applications").update(patch).eq("id", app.id);
  }

  async function remove() {
    if (!confirm(`Delete ${app.role} at ${app.company}? This can't be undone.`)) return;
    await createClient().from("applications").delete().eq("id", app.id);
    router.push("/jobs");
  }

  const unanswered = a ? a.questions.filter((q) => !app.fit_answers?.[q]?.trim()).length : 0;
  const checklist = [
    { label: "Match analysed", done: analysed },
    { label: "Questions answered", done: analysed && unanswered === 0 },
    { label: "Resume tailored", done: !!app.tailored_resume },
    { label: "Outreach written", done: !!app.outreach },
    { label: "Applied", done: ["applied", "interviewing", "offer"].includes(app.status) },
    { label: "Interview practised", done: interviews.length > 0 },
  ];

  const next: { label: string; sub: string; go: () => void } | null = !analysed
    ? null
    : unanswered
      ? { label: `Answer ${unanswered} question${unanswered > 1 ? "s" : ""}`, sub: "Sharpens your match score", go: () => setTab("overview") }
      : !app.tailored_resume
        ? { label: "Tailor your resume", sub: "Built around what they want", go: () => setTab("resume") }
        : !app.outreach
          ? { label: "Message the hiring manager", sub: "A note + a short message", go: () => setTab("outreach") }
          : app.status === "saved"
            ? { label: "Mark as applied", sub: "Once you've sent your resume", go: () => update({ status: "applied", applied_on: new Date().toISOString().slice(0, 10) }) }
            : { label: "Practise the interview", sub: "6 questions, by voice", go: () => setTab("practice") };

  const strong = a ? a.top_skills.filter((s) => s.match === "strong").length : 0;

  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5 text-[0.88rem] text-muted">
        <Link href="/jobs" className="hover:text-ink">Jobs</Link>
        <ChevronRight size={14} className="text-faint" />
        <span className="truncate text-ink">{app.role}</span>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[270px_minmax(0,1fr)_300px]">
        {/* ── Left: job profile ── */}
        <aside className="card overflow-hidden fade-up xl:sticky xl:top-6">
          <div className="flex flex-col items-center px-5 pb-5 pt-6 text-center">
            <CompanyAvatar name={app.company} size={64} />
            <div className="mt-3 text-[1.08rem] font-semibold leading-snug">{app.role}</div>
            <div className="mt-0.5 text-muted">{app.company}</div>
            {app.location && <div className="mt-1 flex items-center gap-1 text-[0.85rem] text-faint"><MapPin size={12} /> {app.location}</div>}
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              <StatusPill status={app.status} />
              {a && <MatchChip score={a.fit_score} />}
            </div>
            <div className="mt-5 grid w-full grid-cols-4 gap-2">
              {[
                { label: "Coach", icon: MessageCircle, cls: "bg-sky text-[#3b47b0]", on: () => setCoach(true) },
                { label: "JD", icon: FileText, cls: "bg-sun text-brand", on: () => setShowJd(true) },
                { label: "Edit", icon: Pencil, cls: "bg-lilac text-[#4b3fb3]", on: () => setEditing(true) },
                { label: "Delete", icon: Trash2, cls: "bg-rose text-[#6b3a8f]", on: remove },
              ].map(({ label, icon: Icon, cls, on }) => (
                <button key={label} onClick={on} className="group flex flex-col items-center gap-1.5">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl transition group-hover:-translate-y-0.5 ${cls}`}><Icon size={17} /></span>
                  <span className="text-[0.75rem] text-muted">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3 border-t border-line bg-line-2/60 px-5 py-4 text-[0.88rem]">
            {[
              ["Added", fmtDate(app.created_at)],
              ["Applied on", fmtDate(app.applied_on)],
              ["Company type", app.company_type ?? "—"],
              ["Seniority", a?.seniority ?? "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[0.78rem] text-faint">{k}</div>
                <div className="font-medium">{v}</div>
              </div>
            ))}
            {app.job_url && (
              <a href={app.job_url} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm mt-1 w-full">
                Open listing <ExternalLink size={13} />
              </a>
            )}
          </div>
        </aside>

        {/* ── Center ── */}
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 fade-up">
            <div className="flex flex-wrap gap-1.5">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  disabled={!analysed && key !== "overview"}
                  className={`h-9 rounded-full px-4 text-[0.92rem] font-medium transition disabled:opacity-40 ${
                    tab === key ? "bg-brand text-on-brand shadow-[0_6px_16px_-8px_color-mix(in_srgb,var(--brand)_70%,transparent)]" : "bg-white text-slate-600 ring-1 ring-line hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Menu<Status>
              value={app.status}
              options={STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))}
              onChange={(status) => update({ status, ...(status === "applied" && !app.applied_on ? { applied_on: new Date().toISOString().slice(0, 10) } : {}) })}
              render={(c) => (
                <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${STATUS_META[c.value].dot}`} /> {c.label}</span>
              )}
            />
          </div>

          {tab === "overview" && <Overview app={app} onUpdate={patchLocal} />}
          {tab === "resume" && <ResumeTab app={app} onUpdate={patchLocal} />}
          {tab === "outreach" && <OutreachTab app={app} onUpdate={patchLocal} />}
          {tab === "practice" && <PracticeTab app={app} interviews={interviews} />}
        </section>

        {/* ── Right: AI summary ── */}
        <aside className="space-y-4 xl:sticky xl:top-6 stagger">
          <div className="card p-5">
            <div className="flex items-center gap-2 font-semibold"><Sparkles size={16} className="text-brand" /> AI Summary</div>
            {a ? (
              <>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-[2.4rem] font-semibold leading-none tracking-tight">{a.fit_score * 10}</span>
                  <span className="text-muted">/100</span>
                  <span className={`ml-auto chip ${a.fit_score >= 7 ? "bg-good-soft text-good" : a.fit_score >= 5 ? "bg-mid-soft text-mid" : "bg-bad-soft text-bad"}`}>
                    {a.fit_score >= 7 ? "Strong fit" : a.fit_score >= 5 ? "Fair fit" : "Stretch"}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-line-2">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand transition-all duration-1000" style={{ width: `${a.fit_score * 10}%` }} />
                </div>
                <div className="mt-4 space-y-2 text-[0.9rem]">
                  <div className="flex justify-between"><span className="text-muted">Skills you show</span><span className="font-medium">{strong} of {a.top_skills.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Gaps</span><span className="font-medium">{a.gaps.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Open questions</span><span className="font-medium">{unanswered}</span></div>
                </div>
              </>
            ) : (
              <div className="mt-3 space-y-2"><div className="skeleton h-9 w-24" /><div className="skeleton h-2 w-full" /><div className="skeleton h-3 w-3/4" /></div>
            )}
          </div>

          {next && (
            <div className="dark-card p-5">
              <div className="text-[0.82rem] text-white/70">Recommended next action</div>
              <div className="mt-1 text-[1.08rem] font-semibold">{next.label}</div>
              <div className="text-[0.85rem] text-white/65">{next.sub}</div>
              <button onClick={next.go} className="btn btn-sm mt-4 w-full bg-brand text-on-brand hover:opacity-90">
                Do it now <ArrowRight size={14} />
              </button>
            </div>
          )}

          <div className="card p-5">
            <div className="mb-3 font-semibold">Checklist</div>
            <ol className="relative space-y-3">
              <span className="absolute bottom-2 left-[9px] top-2 w-px bg-line" />
              {checklist.map((c) => (
                <li key={c.label} className="relative flex items-center gap-3 text-[0.9rem]">
                  <span className={`relative grid h-[19px] w-[19px] place-items-center rounded-full ${c.done ? "bg-brand text-on-brand" : "border-2 border-line bg-white"}`}>
                    {c.done && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className={c.done ? "text-ink" : "text-muted"}>{c.label}</span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      <Modal open={showJd} onClose={() => setShowJd(false)} title="Job description" width={720}>
        <div className="thin-scroll max-h-[65vh] overflow-y-auto whitespace-pre-wrap pr-2 leading-relaxed text-slate-700">{app.jd}</div>
      </Modal>

      <Modal open={editing} onClose={() => setEditing(false)} title="Job details" width={460}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const v = (k: string) => String(fd.get(k) ?? "").trim();
            update({ company: v("company") || app.company, role: v("role") || app.role, location: v("location") || null, job_url: v("job_url") || null });
            setEditing(false);
          }}
        >
          <div><label className="label">Company</label><input name="company" className="field" defaultValue={app.company} required /></div>
          <div><label className="label">Role</label><input name="role" className="field" defaultValue={app.role} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Location</label><input name="location" className="field" defaultValue={app.location ?? ""} /></div>
            <div><label className="label">Job link</label><input name="job_url" className="field" defaultValue={app.job_url ?? ""} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      {coach && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/25 backdrop-blur-[2px]" onClick={() => setCoach(false)}>
          <div className="flex h-full w-full max-w-lg flex-col bg-bg shadow-2xl" style={{ animation: "slide-in .25s cubic-bezier(.2,.7,.2,1)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line bg-white px-5 py-3.5">
              <div>
                <div className="font-semibold">Coach</div>
                <div className="text-[0.82rem] text-muted">Knows your resume and this job</div>
              </div>
              <button className="btn-quiet" onClick={() => setCoach(false)} aria-label="Close"><X size={16} /></button>
            </div>
            <div className="thin-scroll flex-1 overflow-y-auto px-5 pt-4">
              <ChatPanel sessionId={coachSessionId} initialMessages={coachMessages} placeholder="Ask anything about this job…" suggestions={["How do I explain my biggest gap?", "What should I research first?", "Rewrite my summary for this role"]} />
            </div>
          </div>
          <style>{`@keyframes slide-in { from { transform: translateX(32px); opacity: 0 } }`}</style>
        </div>
      )}
    </div>
  );
}
