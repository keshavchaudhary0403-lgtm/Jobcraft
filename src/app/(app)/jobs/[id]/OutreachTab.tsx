"use client";

import { useState } from "react";
import { AlertCircle, Search, Send, Sparkles, UserPlus, RotateCcw } from "lucide-react";
import type { Application } from "@/lib/types";
import type { Outreach } from "@/lib/tasks";
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

  const search = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${app.company} ${app.role.split(" ").slice(-2).join(" ")} hiring`)}`;
  const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {dialog}
      <div className="card flex flex-wrap items-end gap-3 p-5 fade-up">
        <div className="min-w-[220px] flex-1">
          <label className="label">Who are you writing to? <span className="text-faint">· optional</span></label>
          <input className="field" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. Priya Sharma, Head of Growth" />
        </div>
        <a href={search} target="_blank" rel="noreferrer" className="btn btn-ghost"><Search size={15} /> Find on LinkedIn</a>
        <button className="btn btn-brand" onClick={async () => { if (o && (await ask({ title: "Rewrite messages?", body: "New messages replace the current ones. Uses AI credit.", confirm: "Rewrite" })) === null) return; generate(); }} disabled={busy}>
          {busy ? <Spinner /> : o ? <RotateCcw size={15} /> : <Sparkles size={15} />} {o ? "Rewrite" : "Write messages"}
        </button>
      </div>

      {error && <p className="flex items-center gap-1.5 text-[14px] text-bad"><AlertCircle size={14} /> {error}</p>}
      {busy && !o && <Working steps={["Finding a real challenge they face…", "Matching it to your strongest result…", "Keeping it short and human…"]} />}

      {o && (
        <div className={`grid items-start gap-4 md:grid-cols-2 stagger transition ${busy ? "opacity-50" : ""}`}>
          <Panel title="Connection note" icon={<UserPlus size={15} />} action={<CharCount text={o.connection_note} max={250} />} className="flex flex-col" bodyClass="flex flex-1 flex-col p-5">
            <p className="flex-1 whitespace-pre-wrap leading-[1.43] text-slate-800">{o.connection_note}</p>
            <div className="mt-5"><CopyButton text={o.connection_note} /></div>
          </Panel>
          <Panel title="Message" icon={<Send size={15} />} action={<CharCount text={o.message} max={110} unit="words" />} className="flex flex-col" bodyClass="flex flex-1 flex-col p-5">
            <p className="flex-1 whitespace-pre-wrap leading-[1.43] text-slate-800">{o.message}</p>
            <div className="mt-5"><CopyButton text={o.message} /></div>
          </Panel>
        </div>
      )}
    </div>
  );
}
