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
  X,
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
  const fitColor = fit == null ? "var(--line)" : fit >= 70 ? "var(--color-good)" : fit >= 50 ? "var(--color-mustard)" : "var(--color-clay)";
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
    { key: "overview", label: "Match", sub: !analysed ? "Reading the job…" : unanswered ? `${unanswered} question${unanswered > 1 ? "s" : ""} open` : `${fit}% fit`, done: analysed && !unanswered },
    { key: "resume", label: "Resume", sub: app.tailored_resume ? "Tailored" : "Not tailored yet", done: !!app.tailored_resume },
    { key: "outreach", label: "Outreach", sub: app.outreach ? "Written" : "Not written yet", done: !!app.outreach },
    { key: "practice", label: "Practice", sub: `${interviews.length} round${interviews.length === 1 ? "" : "s"} done`, done: interviews.length > 0 },
  ];
  const facts = [
    ["Added", fmtDate(app.created_at)],
    ["Applied", fmtDate(app.applied_on)],
    ["Company", app.company_type ?? "—"],
    ["Level", a?.seniority ?? "—"],
  ];

  return (
    <div className="space-y-5">
      {dialog}
      <Link href="/jobs" className="inline-flex items-center gap-1 pt-2 text-[0.9rem] font-medium text-muted hover:text-ink"><ChevronRight size={15} className="rotate-180" /> All jobs</Link>

      {/* ── Hero ── */}
      <section className="card overflow-hidden fade-up">
        <div className="grid gap-6 p-7 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <CompanyAvatar name={app.company} size={52} />
              <div className="min-w-0">
                <div className="truncate text-[1rem] font-semibold">{app.company}</div>
                <div className="flex flex-wrap items-center gap-x-3 text-[0.86rem] text-muted">
                  {app.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{app.location}</span>}
                  <Menu<Status>
                    align="left"
                    value={app.status}
                    options={STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))}
                    onChange={(status) => update({ status, ...(status === "applied" && !app.applied_on ? { applied_on: new Date().toISOString().slice(0, 10) } : {}) })}
                    render={(c) => <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${STATUS_META[c.value].dot}`} /> {c.label}</span>}
                  />
                </div>
              </div>
            </div>
            <h1 className="mt-5 text-[2.5rem] font-bold leading-[1.02]">{app.role}</h1>
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-faint">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                { label: "Job description", icon: FileText, on: () => setShowJd(true) },
                { label: "Edit", icon: Pencil, on: () => setEditing(true) },
              ].map(({ label, icon: Icon, on }) => (
                <button key={label} onClick={on} className="btn btn-ghost h-10"><Icon size={15} /> {label}</button>
              ))}
              {app.job_url && <a href={app.job_url} target="_blank" rel="noreferrer" className="btn btn-ghost h-10">Listing <ExternalLink size={14} /></a>}
              <button onClick={remove} className="btn h-10 text-bad hover:bg-bad-soft" aria-label="Delete job"><Trash2 size={15} /></button>
            </div>
          </div>

          {/* Fit dial */}
          <div className="flex flex-col items-center justify-center rounded-[22px] px-8 py-6" style={{ background: "var(--color-cream)" }}>
            {a ? (
              <>
                <div className="relative grid h-[150px] w-[150px] place-items-center">
                  <svg width="150" height="150" className="-rotate-90">
                    <circle cx="75" cy="75" r="64" fill="none" stroke="var(--line)" strokeWidth="14" />
                    <circle cx="75" cy="75" r="64" fill="none" stroke={fitColor} strokeWidth="14" strokeLinecap="round" strokeDasharray={2 * Math.PI * 64} strokeDashoffset={2 * Math.PI * 64 * (1 - (fit ?? 0) / 100)} style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)" }} />
                  </svg>
                  <div className="absolute text-center">
                    <div className="font-display text-[2.8rem] font-bold leading-none tabular-nums">{fit}<span className="text-[1.1rem] text-muted">%</span></div>
                    <div className="mt-1 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted">Your fit</div>
                  </div>
                </div>
                {typeof a.prev_score === "number" && a.prev_score !== a.fit_score && (
                  <div className={`mt-3 rounded-full px-3 py-1 text-[0.8rem] font-semibold ${a.fit_score > a.prev_score ? "bg-good-soft text-good" : "bg-mustard-soft text-[#8a6414]"}`}>{a.prev_score * 10} → {a.fit_score * 10}</div>
                )}
              </>
            ) : (
              <div className="grid h-[150px] w-[150px] place-items-center text-center text-[0.9rem] text-muted">Reading the job…</div>
            )}
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
                  <span className={`mt-2 text-[0.8rem] ${isCur ? "font-bold text-clay" : x.done ? "font-medium" : "text-faint"}`}>{x.label}</span>
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
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[0.9rem] font-bold ${on ? "bg-cream text-side" : c.done ? "bg-brand text-cream" : "bg-line-2 text-muted"}`}>{c.done && !on ? <Check size={15} strokeWidth={3} /> : String(i + 1).padStart(2, "0")}</span>
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
      <button onClick={() => setCoach(true)} className="fixed bottom-4 right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-side px-4 font-semibold sm:bottom-6 sm:right-6 sm:pl-5 sm:pr-6 text-cream shadow-[0_20px_40px_-16px_rgba(22,48,43,.7)] transition hover:bg-brand">
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
