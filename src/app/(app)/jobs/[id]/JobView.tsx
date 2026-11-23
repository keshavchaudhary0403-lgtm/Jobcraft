"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, LayoutDashboard, MapPin, MessageCircle, Mic, Send, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STATUSES, type Application, type Message, type Session, type Status } from "@/lib/types";
import { CompanyAvatar, STATUS_META } from "@/components/ui";
import { ChatPanel } from "@/components/ChatPanel";
import { Overview } from "./Overview";
import { ResumeTab } from "./ResumeTab";
import { OutreachTab } from "./OutreachTab";
import { PracticeTab } from "./PracticeTab";

const TABS = [
  { key: "overview", label: "Match", icon: LayoutDashboard },
  { key: "resume", label: "Resume", icon: FileText },
  { key: "outreach", label: "Outreach", icon: Send },
  { key: "practice", label: "Practice", icon: Mic },
] as const;
type Tab = (typeof TABS)[number]["key"];

export function JobView({
  app: initial,
  coachSessionId,
  coachMessages,
  interviews,
}: {
  app: Application;
  coachSessionId: string;
  coachMessages: Message[];
  interviews: Session[];
}) {
  const router = useRouter();
  const [app, setApp] = useState(initial);
  const [tab, setTab] = useState<Tab>("overview");
  const [coach, setCoach] = useState(false);

  async function update(patch: Partial<Application>) {
    setApp((a) => ({ ...a, ...patch }));
    await createClient().from("applications").update(patch).eq("id", app.id);
  }

  async function remove() {
    if (!confirm(`Delete ${app.role} at ${app.company}? This can't be undone.`)) return;
    await createClient().from("applications").delete().eq("id", app.id);
    router.push("/jobs");
  }

  const analysed = !!app.analysis;

  return (
    <div>
      <Link href="/jobs" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft size={15} /> Jobs</Link>

      <header className="mb-6 flex flex-wrap items-start gap-4 fade-up">
        {analysed ? <CompanyAvatar name={app.company} size={52} /> : <div className="skeleton h-[52px] w-[52px] rounded-xl" />}
        <div className="min-w-0 flex-1">
          {analysed ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">{app.role}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                <span className="font-medium text-slate-700">{app.company}</span>
                {app.location && <span className="flex items-center gap-1"><MapPin size={13} /> {app.location}</span>}
                {app.company_type && <span>{app.company_type}</span>}
                {app.job_url && (
                  <a href={app.job_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-ink hover:underline">
                    Listing <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="skeleton h-6 w-64" />
              <div className="skeleton h-4 w-40" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className={`pointer-events-none absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${STATUS_META[app.status].dot}`} />
            <select
              className="field w-auto cursor-pointer py-2 pl-7 pr-8 text-sm font-medium"
              value={app.status}
              onChange={(e) => {
                const status = e.target.value as Status;
                update({ status, ...(status === "applied" && !app.applied_on ? { applied_on: new Date().toISOString().slice(0, 10) } : {}) });
              }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-ghost px-3" onClick={() => setCoach(true)}><MessageCircle size={16} /> <span className="hidden sm:inline">Ask coach</span></button>
          <button className="btn-quiet rounded-lg" onClick={remove} title="Delete job" aria-label="Delete job"><Trash2 size={16} /></button>
        </div>
      </header>

      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1 fade-up">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            disabled={!analysed && key !== "overview"}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-40 ${
              tab === key ? "bg-ink text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>

      {tab === "overview" && <Overview app={app} onUpdate={(p) => setApp((a) => ({ ...a, ...p }))} onNext={() => setTab("resume")} />}
      {tab === "resume" && <ResumeTab app={app} onUpdate={(p) => setApp((a) => ({ ...a, ...p }))} />}
      {tab === "outreach" && <OutreachTab app={app} onUpdate={(p) => setApp((a) => ({ ...a, ...p }))} />}
      {tab === "practice" && <PracticeTab app={app} interviews={interviews} />}

      {coach && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/20 backdrop-blur-[2px]" onClick={() => setCoach(false)}>
          <div className="flex h-full w-full max-w-xl flex-col bg-bg shadow-2xl" style={{ animation: "slide-in .3s cubic-bezier(.2,.7,.2,1)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
              <div>
                <div className="font-medium">Coach</div>
                <div className="text-xs text-muted">Knows your resume and this job</div>
              </div>
              <button className="btn-quiet rounded-lg" onClick={() => setCoach(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pt-4">
              <ChatPanel
                sessionId={coachSessionId}
                initialMessages={coachMessages}
                placeholder="Ask anything about this job…"
                suggestions={["How should I explain my biggest gap?", "What should I research before applying?", "Rewrite my summary for this role"]}
              />
            </div>
          </div>
          <style>{`@keyframes slide-in { from { transform: translateX(40px); opacity: 0 } }`}</style>
        </div>
      )}
    </div>
  );
}
