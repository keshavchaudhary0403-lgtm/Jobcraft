"use client";

import { useState } from "react";
import { AlertCircle, ArrowUpRight, BadgeCheck, Send, Sparkles, UserPlus, RotateCcw, UserSearch } from "lucide-react";
import type { Application } from "@/lib/types";
import type { Analysis, Outreach } from "@/lib/tasks";
import { CharCount, CopyButton, Spinner, Working, useAsk } from "@/components/client-ui";
import { Panel } from "@/components/ui";
import { useGenerate } from "@/components/useGenerate";

export function OutreachTab({ app, onUpdate }: { app: Application; onUpdate: (p: Partial<Application>) => void }) {
  const o = app.outreach as Outreach | null;
  const [contact, setContact] = useState(app.hiring_contact ?? "");
  const { run, busy, error } = useGenerate<Outreach>("outreach", app.id);

  const [ask, dialog] = useAsk();
  async function generate() {
    const res = await run(contact.trim() ? { contact: contact.trim() } : undefined);
    if (res) onUpdate({ outreach: res, hiring_contact: contact.trim() || app.hiring_contact });
  }

  const an = app.analysis as Analysis | null;
  const people = (q: string) => `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(q)}`;
  // Older analyses have no hiring titles: derive sensible ones from the role ("Senior Category Manager" → "Head of Category").
  const core = app.role
    .replace(/\(.*?\)/g, "")
    .replace(/\b(senior|sr\.?|junior|jr\.?|lead|associate|assistant|trainee|manager|head|executive|specialist|analyst|officer|coordinator|director|vp|of|and|&|-)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const titles = an?.hiring_titles?.length ? an.hiring_titles : core ? [`Head of ${core}`, `${core} Director`] : ["Hiring Manager"];
  const company = app.company.replace(/\(.*?\)/g, "").trim();
  const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {dialog}
      <Panel title="1 · Find the hiring person" sub="The PDF's rule: write to the person who hires — the hiring manager or the recruiter — not a general inbox." icon={<UserSearch size={15} />}>
        {app.hiring_contact && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-good-soft/60 px-3.5 py-2.5 text-[0.9rem]">
            <BadgeCheck size={16} className="shrink-0 text-good" />
            <span>Named in the job post: <b className="font-semibold">{app.hiring_contact}</b></span>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-muted">Hiring manager — likely titles</div>
            <div className="flex flex-wrap gap-2">
              {titles.map((t) => (
                <a key={t} href={people(`${t} ${company}`)} target="_blank" rel="noreferrer" className="pill-link">
                  {t} <ArrowUpRight size={12} />
                </a>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-muted">Recruiters</div>
            <div className="flex flex-wrap gap-2">
              {["Talent Acquisition", "Recruiter", "HR Business Partner"].map((t) => (
                <a key={t} href={people(`${t} ${company}`)} target="_blank" rel="noreferrer" className="pill-link">
                  {t} <ArrowUpRight size={12} />
                </a>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-[0.82rem] text-muted">Opens a LinkedIn people search at {company}. Pick the person whose team this role sits in; a recruiter who posted the job is next best.</p>
      </Panel>

      <div className="card fade-up">
        <div className="flex items-center gap-2.5 border-b border-line bg-line-2/40 px-5 py-3">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-brand"><Send size={15} /></span>
          <div className="font-bold">2 · Write to them</div>
        </div>
        <div className="flex flex-wrap items-end gap-3 p-5">
          <div className="min-w-[220px] flex-1">
            <label className="label">Who did you find? <span className="text-faint">· name and title, optional</span></label>
            <input className="field" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. Priya Sharma, Head of Category" />
          </div>
          <button className="btn btn-brand" onClick={async () => { if (o && (await ask({ title: "Rewrite messages?", body: "New messages replace the current ones. Uses AI credit.", confirm: "Rewrite" })) === null) return; generate(); }} disabled={busy}>
            {busy ? <Spinner /> : o ? <RotateCcw size={15} /> : <Sparkles size={15} />} {o ? "Rewrite" : "Write messages"}
          </button>
        </div>
      </div>

      {error && <p className="flex items-center gap-1.5 text-sm text-bad"><AlertCircle size={14} /> {error}</p>}
      {busy && !o && <Working steps={["Finding a real challenge they face…", "Matching it to your strongest result…", "Keeping it short and human…"]} />}

      {o && (
        <div className={`grid items-start gap-4 md:grid-cols-2 stagger transition ${busy ? "opacity-50" : ""}`}>
          <Panel title="Connection note" icon={<UserPlus size={15} />} action={<CharCount text={o.connection_note} max={250} />} className="flex flex-col" bodyClass="flex flex-1 flex-col p-5">
            <p className="flex-1 whitespace-pre-wrap leading-relaxed text-slate-800">{o.connection_note}</p>
            <div className="mt-5"><CopyButton text={o.connection_note} /></div>
          </Panel>
          <Panel title="Message" icon={<Send size={15} />} action={<CharCount text={o.message} max={110} unit="words" />} className="flex flex-col" bodyClass="flex flex-1 flex-col p-5">
            <p className="flex-1 whitespace-pre-wrap leading-relaxed text-slate-800">{o.message}</p>
            <div className="mt-5"><CopyButton text={o.message} /></div>
          </Panel>
        </div>
      )}
    </div>
  );
}
