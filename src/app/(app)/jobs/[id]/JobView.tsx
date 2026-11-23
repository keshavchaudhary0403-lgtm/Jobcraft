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
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STATUSES, type Application, type Message, type Session, type Status } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { CompanyAvatar, STATUS_META } from "@/components/ui";
import { Menu, Modal, useAsk } from "@/components/client-ui";
import { ChatPanel } from "@/components/ChatPanel";
import { Overview, questionList } from "./Overview";
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
  const [tab, setTabRaw] = useState<Tab>(TABS.some((t) => t.key === initialTab) && initial.analysis ? (initialTab as Tab) : "overview");
  const setTab = (t: Tab) => {
    setTabRaw(t);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const [coach, setCoach] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showJd, setShowJd] = useState(false);
  const a = app.analysis as Analysis | null;
  const analysed = !!a;
  const patchLocal = (p: Partial<Application>) => setApp((x) => ({ ...x, ...p }));
  const [ask, dialog] = useAsk();

  async function update(patch: Partial<Application>) {
    patchLocal(patch);
    await createClient().from("applications").update(patch).eq("id", app.id);
  }

  async function remove() {
    const ok = await ask({ title: "Delete job", body: <>Delete <b>{app.role}</b> at <b>{app.company}</b>? Its resume, outreach and practice sessions go too. This can&apos;t be undone.</>, confirm: "Delete", danger: true });
    if (ok === null) return;
    await createClient().from("applications").delete().eq("id", app.id);
    router.push("/jobs");
  }

  const qs = questionList(a);
  const unanswered = qs.filter((q) => !app.fit_answers?.[q]?.trim()).length;
  const [askAt, setAskAt] = useState<number | null>(null);
  const openQuestions = () => {
    setTab("overview");
    setAskAt(Math.max(0, qs.findIndex((q) => !app.fit_answers?.[q]?.trim())));
  };
  const checklist = [
    { label: "Match analysed", done: analysed, go: () => setTab("overview") },
    { label: "Questions answered", done: analysed && unanswered === 0, go: () => (unanswered ? openQuestions() : setTab("overview")) },
    { label: "Resume tailored", done: !!app.tailored_resume, go: () => setTab("resume") },
    { label: "Outreach written", done: !!app.outreach, go: () => setTab("outreach") },
    {
      label: "Applied",
      done: ["applied", "interviewing", "offer"].includes(app.status),
      go: () => app.status === "saved" && update({ status: "applied", applied_on: new Date().toISOString().slice(0, 10) }),
    },
    { label: "Interview practised", done: interviews.length > 0, go: () => setTab("practice") },
  ];

  const next: { label: string; sub: string; go: () => void } | null = !analysed
    ? null
    : unanswered
      ? { label: `Answer ${unanswered} question${unanswered > 1 ? "s" : ""}`, sub: "Sharpens your match score", go: openQuestions }
      : !app.tailored_resume
        ? { label: "Tailor your resume", sub: "Built around what they want", go: () => setTab("resume") }
        : !app.outreach
          ? { label: "Message the hiring manager", sub: "A note + a short message", go: () => setTab("outreach") }
          : app.status === "saved"
            ? { label: "Mark as applied", sub: "Once you've sent your resume", go: () => update({ status: "applied", applied_on: new Date().toISOString().slice(0, 10) }) }
            : { label: "Practise the interview", sub: "6 questions, by voice", go: () => setTab("practice") };

  const strong = a ? a.top_skills.filter((s) => s.match === "strong").length : 0;
  const currentStep = checklist.findIndex((c) => !c.done);
  const fit = a ? (a.fit_score >= 7 ? { label: "Strong fit", cls: "bg-good-soft text-good" } : a.fit_score >= 5 ? { label: "Fair fit", cls: "bg-mid-soft text-mid" } : { label: "Stretch", cls: "bg-bad-soft text-bad" }) : null;
  const meta = [app.company, app.location, a?.seniority, app.company_type].filter(Boolean) as string[];

  return (
    <div>
      {dialog}
      <nav className="mb-3 flex items-center gap-1.5 text-[0.86rem] text-muted">
        <Link href="/jobs" className="hover:text-ink">Jobs</Link>
        <ChevronRight size={13} className="text-faint" />
        <span className="truncate">{app.company}</span>
      </nav>

      {/* ── Job header ── */}
      <header className="card mb-6 overflow-hidden fade-up">
        <div className="flex flex-wrap items-start gap-4 px-6 pb-5 pt-6">
          <CompanyAvatar name={app.company} size={56} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[1.45rem] font-semibold leading-tight tracking-tight">{app.role}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.92rem] text-muted">
              {meta.map((m, i) => (
                <span key={m} className="flex items-center gap-2">
                  {i > 0 && <span className="h-1 w-1 rounded-full bg-faint" />}
                  {i === 1 && app.location === m ? <span className="flex items-center gap-1"><MapPin size={13} />{m}</span> : m}
                </span>
              ))}
              <span className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-faint" /> Added {fmtDate(app.created_at)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Menu<Status>
              value={app.status}
              options={STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))}
              onChange={(status) => update({ status, ...(status === "applied" && !app.applied_on ? { applied_on: new Date().toISOString().slice(0, 10) } : {}) })}
              render={(c) => <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${STATUS_META[c.value].dot}`} /> {c.label}</span>}
            />
            <button className="btn btn-ghost btn-sm" onClick={() => setShowJd(true)}><FileText size={14} /> Job description</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setCoach(true)}><MessageCircle size={14} /> Coach</button>
            {app.job_url && <a href={app.job_url} target="_blank" rel="noreferrer" className="btn-quiet" title="Open listing" aria-label="Open listing"><ExternalLink size={16} /></a>}
            <button className="btn-quiet" onClick={() => setEditing(true)} title="Edit details" aria-label="Edit details"><Pencil size={16} /></button>
            <button className="btn-quiet hover:text-bad" onClick={remove} title="Delete job" aria-label="Delete job"><Trash2 size={16} /></button>
          </div>
        </div>

        {/* Score · journey · next action */}
        <div className="grid items-center gap-5 border-t border-line bg-line-2/40 px-6 py-4 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className="flex items-center gap-4 lg:border-r lg:border-line lg:pr-6">
            {a ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-[2rem] font-semibold leading-none tracking-tight">{a.fit_score * 10}</span>
                  <span className="text-[0.85rem] text-muted">/100</span>
                </div>
                <div>
                  <span className={`chip ${fit!.cls}`}>{fit!.label}</span>
                  <div className="mt-1 text-[0.78rem] text-muted">
                    {typeof a.prev_score === "number" && a.prev_score !== a.fit_score
                      ? <span className="font-semibold text-good">{a.prev_score * 10} → {a.fit_score * 10}</span>
                      : <>{strong} of {a.top_skills.length} skills shown</>}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted"><span className="skeleton h-8 w-14" /> Scoring…</div>
            )}
          </div>

          <ol className="flex min-w-0 items-center overflow-x-auto">
            {checklist.map((c, i) => {
              const current = i === currentStep;
              return (
                <li key={c.label} className="flex min-w-0 flex-1 items-center">
                  <button
                    onClick={c.go}
                    disabled={!analysed && i !== 0}
                    title={c.label === "Applied" && !c.done ? "Mark as applied" : c.label}
                    className="group flex min-w-0 flex-col items-center gap-1.5 px-1 disabled:cursor-default"
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.75rem] font-semibold transition ${c.done ? "bg-brand text-on-brand" : current ? "bg-white text-brand ring-2 ring-brand" : "bg-white text-faint ring-1 ring-line group-enabled:group-hover:ring-brand/40"}`}>
                      {c.done ? <Check size={13} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={`whitespace-nowrap text-[0.76rem] ${c.done ? "text-ink" : current ? "font-semibold text-brand-ink" : "text-muted"}`}>{c.label}</span>
                  </button>
                  {i < checklist.length - 1 && <span className={`mx-1 mb-5 h-0.5 min-w-4 flex-1 rounded-full ${c.done ? "bg-brand" : "bg-line"}`} />}
                </li>
              );
            })}
          </ol>

          <div className="lg:border-l lg:border-line lg:pl-6">
            {next ? (
              <button onClick={next.go} className="btn btn-primary w-full justify-between gap-3 lg:w-auto">
                <span className="text-left leading-tight">
                  <span className="block">{next.label}</span>
                  <span className="block text-[0.74rem] font-normal opacity-80">{next.sub}</span>
                </span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <span className="text-[0.86rem] text-muted">{analysed ? "All steps done" : "Analysing the job…"}</span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-t border-line px-4">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              disabled={!analysed && key !== "overview"}
              className={`relative h-12 shrink-0 px-3.5 text-[0.95rem] font-semibold transition disabled:opacity-40 ${tab === key ? "text-ink" : "text-muted hover:text-ink"}`}
            >
              {label}
              {key === "overview" && unanswered > 0 && <span className="ml-1.5 rounded-full bg-brand-soft px-1.5 text-[0.72rem] text-brand-ink">{unanswered}</span>}
              {tab === key && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand" />}
            </button>
          ))}
        </div>
      </header>

      {/* ── Tab content: full width ── */}
      <section className="min-w-0">
        {tab === "overview" && <Overview app={app} onUpdate={patchLocal} askAt={askAt} onAsk={setAskAt} onGo={(t) => setTab(t)} />}
        {tab === "resume" && <ResumeTab app={app} onUpdate={patchLocal} />}
        {tab === "outreach" && <OutreachTab app={app} onUpdate={patchLocal} />}
        {tab === "practice" && <PracticeTab app={app} interviews={interviews} />}
      </section>

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

      <Modal open={coach} onClose={() => setCoach(false)} title="Coach · knows your resume and this job" width={760}>
        <div className="-mx-1 min-h-[50vh]">
          <ChatPanel sessionId={coachSessionId} initialMessages={coachMessages} placeholder="Ask anything about this job…" suggestions={["How do I explain my biggest gap?", "What should I research first?", "Rewrite my summary for this role"]} />
        </div>
      </Modal>
    </div>
  );
}
