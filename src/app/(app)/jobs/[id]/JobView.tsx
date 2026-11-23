"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ExternalLink, MapPin, MessageCircle, Pencil, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STATUSES, type Application, type Message, type Session, type Status } from "@/lib/types";
import { CompanyAvatar, STATUS_META } from "@/components/ui";
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
  const analysed = !!app.analysis;

  async function update(patch: Partial<Application>) {
    setApp((a) => ({ ...a, ...patch }));
    await createClient().from("applications").update(patch).eq("id", app.id);
  }

  async function remove() {
    if (!confirm(`Delete ${app.role} at ${app.company}? This can't be undone.`)) return;
    await createClient().from("applications").delete().eq("id", app.id);
    router.push("/jobs");
  }

  const done: Record<Tab, boolean> = { overview: analysed, resume: !!app.tailored_resume, outreach: !!app.outreach, practice: interviews.length > 0 };

  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5 text-[0.88rem] text-muted">
        <Link href="/jobs" className="hover:text-ink">Jobs</Link>
        <ChevronRight size={14} className="text-faint" />
        <span className="truncate text-ink">{app.company}</span>
      </div>

      <header className="card mb-5 flex flex-wrap items-center gap-4 p-5 fade-up">
        <CompanyAvatar name={app.company} size={48} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[1.35rem] font-semibold leading-tight tracking-tight">{app.role}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9rem] text-muted">
            <span className="font-medium text-ink">{app.company}</span>
            {app.location && <span className="flex items-center gap-1"><MapPin size={13} /> {app.location}</span>}
            {app.company_type && <span>{app.company_type}</span>}
            {app.job_url && (
              <a href={app.job_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-ink hover:underline">Listing <ExternalLink size={12} /></a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Menu<Status>
            value={app.status}
            options={STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))}
            onChange={(status) => update({ status, ...(status === "applied" && !app.applied_on ? { applied_on: new Date().toISOString().slice(0, 10) } : {}) })}
            render={(c) => (
              <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${STATUS_META[c.value].dot}`} /> {c.label}</span>
            )}
          />
          <button className="btn-quiet" onClick={() => setEditing(true)} title="Edit job details" aria-label="Edit job details"><Pencil size={15} /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCoach(true)}><MessageCircle size={15} /> Ask coach</button>
          <button className="btn-quiet" onClick={remove} title="Delete job" aria-label="Delete job"><Trash2 size={15} /></button>
        </div>
      </header>

      <nav className="mb-5 flex gap-6 border-b border-line fade-up">
        {TABS.map(({ key, label }, i) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            disabled={!analysed && key !== "overview"}
            className={`-mb-px flex items-center gap-2 border-b-2 pb-2.5 text-[0.95rem] font-medium transition disabled:opacity-40 ${
              tab === key ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <span className={`grid h-5 w-5 place-items-center rounded-full text-[0.7rem] ${done[key] ? "bg-brand text-white" : "bg-line-2 text-faint"}`}>{done[key] ? "✓" : i + 1}</span>
            {label}
          </button>
        ))}
      </nav>

      {tab === "overview" && <Overview app={app} onUpdate={(p) => setApp((a) => ({ ...a, ...p }))} onNext={() => setTab("resume")} />}
      {tab === "resume" && <ResumeTab app={app} onUpdate={(p) => setApp((a) => ({ ...a, ...p }))} />}
      {tab === "outreach" && <OutreachTab app={app} onUpdate={(p) => setApp((a) => ({ ...a, ...p }))} />}
      {tab === "practice" && <PracticeTab app={app} interviews={interviews} />}

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
