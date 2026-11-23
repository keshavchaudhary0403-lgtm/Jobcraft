"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ChatPanel, type StepDef } from "@/components/ChatPanel";
import { STATUSES, type Application, type Message, type Status } from "@/lib/types";
import { extractResume } from "@/lib/prompts";

export function Workspace({
  app: initial,
  sessionId,
  messages,
  steps,
  hasResume,
}: {
  app: Application;
  sessionId: string;
  messages: Message[];
  steps: StepDef[];
  hasResume: boolean;
}) {
  const router = useRouter();
  const [app, setApp] = useState(initial);
  const [panel, setPanel] = useState<"" | "jd" | "resume" | "details">("");
  const [saved, setSaved] = useState("");

  async function update(patch: Partial<Application>) {
    setApp((a) => ({ ...a, ...patch }));
    const { error } = await createClient().from("applications").update(patch).eq("id", app.id);
    setSaved(error ? `Error: ${error.message}` : "Saved ✓");
    setTimeout(() => setSaved(""), 1500);
  }

  async function remove() {
    if (!confirm(`Delete ${app.role} @ ${app.company} and its whole chat? This can't be undone.`)) return;
    await createClient().from("applications").delete().eq("id", app.id);
    router.push("/applications");
  }

  function printResume() {
    const w = window.open("", "_blank");
    if (!w || !app.tailored_resume) return;
    const esc = app.tailored_resume.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    w.document.write(
      `<html><head><title>Resume - ${app.company}</title><style>body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.4;max-width:7.5in;margin:0.5in auto;white-space:pre-wrap;color:#111}</style></head><body>${esc
        .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
        .replace(/^#+\s*(.+)$/gm, "<b>$1</b>")}</body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="mt-3">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl leading-tight">{app.role}</h1>
          <div className="mt-1 text-muted">
            {app.company}
            {app.company_type ? ` · ${app.company_type}` : ""}
            {app.job_url && (
              <>
                {" · "}
                <a href={app.job_url} target="_blank" rel="noreferrer" className="text-accent underline">job link</a>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="field w-auto py-1.5 capitalize"
            value={app.status}
            onChange={(e) => {
              const status = e.target.value as Status;
              update({ status, ...(status === "applied" && !app.applied_on ? { applied_on: new Date().toISOString().slice(0, 10) } : {}) });
            }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {saved && <span className="text-xs text-muted">{saved}</span>}
        </div>
      </div>

      {!hasResume && (
        <Link href="/profile" className="mb-4 block rounded-xl border border-warm/30 bg-warm-soft px-4 py-3 text-sm text-warm">
          Add your master resume first — the prompts need it. →
        </Link>
      )}

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {([
          ["jd", "Job description"],
          ["resume", app.tailored_resume ? "Tailored resume ✓" : "Tailored resume"],
          ["details", "Notes & contact"],
        ] as const).map(([k, label]) => (
          <button key={k} onClick={() => setPanel(panel === k ? "" : k)} className={`btn ${panel === k ? "bg-ink text-white" : "btn-ghost"} py-1.5`}>
            {label}
          </button>
        ))}
        <Link href={`/interview?app=${app.id}`} className="btn btn-ghost py-1.5">Practise interview →</Link>
        {app.status === "offer" && <Link href={`/negotiation?app=${app.id}`} className="btn btn-ghost py-1.5">Negotiate offer →</Link>}
      </div>

      {panel === "jd" && (
        <div className="card mb-4 p-5">
          <textarea className="field text-sm" rows={14} defaultValue={app.jd} onBlur={(e) => e.target.value !== app.jd && update({ jd: e.target.value })} />
          <p className="mt-1 text-xs text-muted">Edits save when you click outside. New prompts will use the updated JD.</p>
        </div>
      )}

      {panel === "resume" && (
        <div className="card mb-4 p-5">
          {app.tailored_resume ? (
            <>
              <div className="mb-2 flex flex-wrap gap-2">
                <button className="btn btn-ghost py-1.5 text-sm" onClick={() => navigator.clipboard.writeText(app.tailored_resume!)}>Copy</button>
                <button className="btn btn-ghost py-1.5 text-sm" onClick={printResume}>Print / Save as PDF</button>
              </div>
              <textarea
                className="field font-mono text-xs leading-relaxed"
                rows={22}
                defaultValue={app.tailored_resume}
                onBlur={(e) => e.target.value !== app.tailored_resume && update({ tailored_resume: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted">
                This is the version for this job. Check every line is true. Edits save when you click outside.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">
              Run <strong>Prompt 3: The Resume Tailor</strong> below. When the AI writes your resume, it&apos;s saved here automatically.
            </p>
          )}
        </div>
      )}

      {panel === "details" && (
        <div className="card mb-4 grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className="label">Hiring person</label>
            <input className="field" defaultValue={app.hiring_contact ?? ""} onBlur={(e) => update({ hiring_contact: e.target.value || null })} />
          </div>
          <div>
            <label className="label">Applied on</label>
            <input type="date" className="field" defaultValue={app.applied_on ?? ""} onBlur={(e) => update({ applied_on: e.target.value || null })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea className="field" rows={4} defaultValue={app.notes ?? ""} onBlur={(e) => update({ notes: e.target.value || null })} placeholder="Referral, follow-up dates, interview rounds…" />
          </div>
          <button onClick={remove} className="justify-self-start text-sm text-warm hover:underline">Delete this application</button>
        </div>
      )}

      <ChatPanel
        sessionId={sessionId}
        initialMessages={messages}
        steps={steps}
        onReply={(text) => {
          const r = extractResume(text);
          if (r) setApp((a) => ({ ...a, tailored_resume: r }));
        }}
      />
    </div>
  );
}
