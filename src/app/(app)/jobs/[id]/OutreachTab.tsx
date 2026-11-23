"use client";

import { useState } from "react";
import { AlertCircle, Search, Send, Sparkles, UserPlus, RotateCcw } from "lucide-react";
import type { Application } from "@/lib/types";
import type { Outreach } from "@/lib/tasks";
import { CharCount, CopyButton, Spinner, Working } from "@/components/client-ui";
import { useGenerate } from "@/components/useGenerate";

export function OutreachTab({ app, onUpdate }: { app: Application; onUpdate: (p: Partial<Application>) => void }) {
  const o = app.outreach as Outreach | null;
  const [contact, setContact] = useState(app.hiring_contact ?? "");
  const { run, busy, error } = useGenerate<Outreach>("outreach", app.id);

  async function generate() {
    const res = await run(contact.trim() ? { contact: contact.trim() } : undefined);
    if (res) onUpdate({ outreach: res, hiring_contact: contact.trim() || app.hiring_contact });
  }

  const search = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${app.company} ${app.role.split(" ").slice(-2).join(" ")} hiring`)}`;
  const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-end gap-3 p-5 fade-up">
        <div className="min-w-[220px] flex-1">
          <label className="label">Who are you writing to? (optional)</label>
          <input className="field" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. Priya Sharma, Head of Growth" />
        </div>
        <a href={search} target="_blank" rel="noreferrer" className="btn btn-ghost"><Search size={15} /> Find on LinkedIn</a>
        <button className="btn btn-brand" onClick={generate} disabled={busy}>
          {busy ? <Spinner /> : o ? <RotateCcw size={15} /> : <Sparkles size={15} />} {o ? "Rewrite" : "Write messages"}
        </button>
      </div>

      {error && <p className="flex items-center gap-1.5 text-sm text-bad"><AlertCircle size={14} /> {error}</p>}
      {busy && !o && <Working steps={["Finding a real challenge they face…", "Matching it to your strongest result…", "Keeping it short and human…"]} />}

      {o && (
        <div className={`grid gap-5 md:grid-cols-2 stagger transition ${busy ? "opacity-50" : ""}`}>
          <div className="card flex flex-col p-6">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium"><UserPlus size={16} className="text-brand" /> Connection note</span>
              <CharCount text={o.connection_note} max={250} />
            </div>
            <p className="mt-4 flex-1 whitespace-pre-wrap leading-relaxed text-slate-700">{o.connection_note}</p>
            <div className="mt-5"><CopyButton text={o.connection_note} /></div>
          </div>
          <div className="card flex flex-col p-6">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium"><Send size={16} className="text-brand" /> Message</span>
              <span className={`text-xs tabular-nums ${words(o.message) > 110 ? "text-bad" : "text-faint"}`}>{words(o.message)}/110 words</span>
            </div>
            <p className="mt-4 flex-1 whitespace-pre-wrap leading-relaxed text-slate-700">{o.message}</p>
            <div className="mt-5"><CopyButton text={o.message} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
