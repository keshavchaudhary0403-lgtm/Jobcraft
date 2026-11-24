"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronRight,
  ChevronDown,
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
import { CompanyAvatar, STATUS_META, Meter } from "@/components/ui";
import { Menu, Modal, useAsk, SidePanel } from "@/components/client-ui";
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

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-");

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

  const fit = a ? a.fit_score * 10 : null;
  const fitColor = fit == null ? "var(--line)" : fit >= 70 ? "var(--color-good)" : fit >= 50 ? "var(--brand)" : "var(--color-bad)";
  const steps = [
    { label: "Decoded", done: analysed, go: () => setTab("overview") },
    { label: "Questions", done: analysed && unanswered === 0, go: () => (unanswered ? openQuestions() : setTab("overview")) },
    { label: "Resume", done: !!app.tailored_resume, go: () => setTab("resume") },
    { label: "Outreach", done: !!app.outreach, go: () => setTab("outreach") },
    { label: "Applied", done: ["applied", "interviewing", "offer", "rejected"].includes(app.status), go: () => app.status === "saved" && update({ status: "applied", applied_on: new Date().toISOString().slice(0, 10) }) },
    { label: "Interview", done: interviews.length > 0 || ["interviewing", "offer"].includes(app.status), go: () => setTab("practice") },
    { label: "Offer", done: app.status === "offer", go: () => router.push("/negotiation") },
  ];
  const cur = steps.findIndex((x) => !x.done);
  const chapters: { key: Tab; label: string; sub: string; done: boolean }[] = [
    { key: "overview", label: "Match", sub: !analysed ? "Reading the job..." : unanswered ? `${unanswered} question${unanswered > 1 ? "s" : ""} open` : `${fit}% fit`, done: analysed && !unanswered },
    { key: "resume", label: "Resume", sub: app.tailored_resume ? "Tailored" : "Not tailored yet", done: !!app.tailored_resume },
    { key: "outreach", label: "Outreach", sub: app.outreach ? "Written" : "Not written yet", done: !!app.outreach },
    { key: "practice", label: "Practice", sub: `${interviews.length} round${interviews.length === 1 ? "" : "s"} done`, done: interviews.length > 0 },
  ];
  const facts = [
    ["Added", fmtDate(app.created_at)],
    ["Applied", fmtDate(app.applied_on)],
    ["Company", app.company_type ?? "-"],
    ["Level", a?.seniority ?? "-"],
  ];

  return (
    <div className="space-y-5">
      {dialog}
      <Link href="/jobs" className="pill-nav h-8 px-3 text-[0.84rem]"><ChevronRight size={15} className="rotate-180" /> All jobs</Link>

      {/* ── Hero (compact) ── */}
      <section className="card overflow-hidden fade-up">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <CompanyAvatar name={app.company} jobUrl={app.job_url} size={52} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 text-[0.92rem] text-muted">
                <span className="font-semibold text-ink">{app.company}</span>
                {app.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{app.location}</span>}
              </div>
              <h1 className="mt-0.5 text-[1.7rem] font-bold leading-[1.1] sm:text-[2rem]">{app.role}</h1>
            </div>
            {a && <FitStat fit={fit} color={fitColor} prev={typeof a.prev_score === "number" && a.prev_score !== a.fit_score ? a.prev_score * 10 : null} className="hidden sm:block" />}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.86rem] text-muted">
            {facts.map(([k, v]) => <span key={k}>{k} <b className="font-semibold text-ink">{v}</b></span>)}
          </div>
          {a ? <FitStat fit={fit} color={fitColor} prev={null} className="mt-4 sm:hidden" /> : <p className="mt-3 text-[0.88rem] text-muted">Reading the job...</p>}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Menu<Status>
              bare
              align="left"
              value={app.status}
              options={STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))}
              onChange={(status) => update({ status, ...(status === "applied" && !app.applied_on ? { applied_on: new Date().toISOString().slice(0, 10) } : {}) })}
              render={(c) => <span className={`inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[0.86rem] font-semibold ${STATUS_META[c.value].cls}`}><span className={`h-2 w-2 rounded-full ${STATUS_META[c.value].dot}`} />{c.label}<ChevronDown size={14} className="opacity-70" /></span>}
            />
            {[
              { label: "Job description", icon: FileText, on: () => setShowJd(true) },
              { label: "Edit", icon: Pencil, on: () => setEditing(true) },
            ].map(({ label, icon: Icon, on }) => (
              <button key={label} onClick={on} className="btn btn-ghost h-9 px-3.5 text-[0.86rem]"><Icon size={14} /> {label}</button>
            ))}
            {app.job_url && <a href={app.job_url} target="_blank" rel="noreferrer" className="btn btn-ghost h-9 px-3.5 text-[0.86rem]">Listing <ExternalLink size={13} /></a>}
            <button onClick={remove} className="btn h-9 w-9 px-0 text-bad hover:bg-bad-soft" aria-label="Delete job" data-tip="Delete this job"><Trash2 size={15} /></button>
          </div>
        </div>

        {/* Journey */}
        <div className="border-t border-line px-7 py-6">
          <ol className="grid grid-cols-7">
            {steps.map((x, i) => {
              const isCur = i === cur;
              return (
                <li key={x.label} className="relative flex flex-col items-center text-center">
                  {i > 0 && <span className={`absolute right-1/2 top-[15px] h-[3px] w-full ${steps[i - 1].done ? "bg-brand" : "bg-line"}`} />}
                  <button onClick={x.go} disabled={!analysed && i > 0} className={`relative z-10 grid h-8 w-8 place-items-center rounded-full text-[0.8rem] font-bold transition disabled:cursor-default ${x.done ? "bg-brand text-cream" : isCur ? "bg-clay text-white ring-[5px] ring-clay-soft" : "border-[1.5px] border-line bg-card text-faint"}`}>
                    {x.done ? <Check size={15} strokeWidth={3} /> : i + 1}
                  </button>
                  <span className={`mt-2 whitespace-nowrap text-[0.8rem] ${isCur ? "font-bold text-clay" : x.done ? "hidden font-medium sm:block" : "hidden text-faint sm:block"}`}>{x.label}</span>
                </li>
              );
            })}
          </ol>
          {next && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-clay-soft px-5 py-3.5">
              <div>
                <div className="font-display text-[1.1rem] font-bold">{next.label}</div>
                <div className="text-[0.86rem] text-muted">{next.sub}</div>
              </div>
              <button onClick={next.go} className="btn btn-clay h-11">Do it now <ArrowRight size={15} /></button>
            </div>
          )}
        </div>
      </section>

      {/* ── Chapters ── */}
      <nav className="grid grid-cols-2 gap-3 md:grid-cols-4 fade-up">
        {chapters.map((c, i) => {
          const on = tab === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setTab(c.key)}
              disabled={!analysed && c.key !== "overview"}
              className={`flex items-center gap-3 rounded-[20px] border-[1.5px] px-4 py-3.5 text-left transition disabled:opacity-40 ${on ? "border-side bg-side text-cream" : "border-line bg-card hover:border-brand/40"}`}
            >
              <span data-tone={on || c.done ? undefined : i % 5} className={`tone-chip grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[0.9rem] font-bold ${on ? "bg-cream text-side" : c.done ? "bg-brand text-cream" : "bg-line-2 text-muted"}`}>{c.done && !on ? <Check size={15} strokeWidth={3} /> : String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0">
                <span className="block font-display text-[1.1rem] font-bold leading-tight">{c.label}</span>
                <span className={`block truncate text-[0.8rem] ${on ? "text-cream/65" : "text-muted"}`}>{c.sub}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <section className="min-w-0 pb-20 fade-up">
        {tab === "overview" && <Overview app={app} onUpdate={patchLocal} askAt={askAt} onAsk={setAskAt} onGo={(t) => setTab(t)} />}
        {tab === "resume" && <ResumeTab app={app} onUpdate={patchLocal} />}
        {tab === "outreach" && <OutreachTab app={app} onUpdate={patchLocal} />}
        {tab === "practice" && <PracticeTab app={app} interviews={interviews} />}
      </section>

      {/* Coach */}
      <button onClick={() => setCoach(true)} className="fixed bottom-28 right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-side px-4 font-semibold lg:bottom-6 sm:right-6 sm:pl-5 sm:pr-6 text-cream shadow-[0_20px_40px_-16px_color-mix(in_srgb,var(--side)_70%,transparent)] transition hover:bg-brand">
        <MessageCircle size={18} className="text-mustard" /> <span className="hidden sm:inline">Ask the coach</span>
      </button>

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

      <SidePanel open={coach} onClose={() => setCoach(false)} title="Coach" sub={`Knows your resume and the ${app.company} job`} icon={<MessageCircle size={18} />}>
        <ChatPanel sessionId={coachSessionId} initialMessages={coachMessages} placeholder="Ask anything about this job..." suggestions={["How do I explain my biggest gap?", "What should I research first?", "Rewrite my summary for this role"]} />
      </SidePanel>
    </div>
  );
}

/** Fit as a number plus a bar (no dial). */
function FitStat({ fit, color, prev, className = "" }: { fit: number | null; color: string; prev: number | null; className?: string }) {
  return (
    <div className={`w-full sm:w-[140px] sm:shrink-0 sm:text-right ${className}`}>
      <div className="flex items-baseline gap-1.5 sm:justify-end">
        <span className="font-display text-[2rem] font-bold leading-none tabular-nums">{fit ?? "-"}<span className="text-[0.95rem] text-muted">%</span></span>
        <span className="text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-muted">fit</span>
      </div>
      <Meter value={(fit ?? 0) / 100} color={color} className="mt-2" />
      {prev != null && fit != null && <div className={`mt-1.5 text-[0.76rem] font-semibold ${fit > prev ? "text-good" : "text-mid"}`}>was {prev}%</div>}
    </div>
  );
}
