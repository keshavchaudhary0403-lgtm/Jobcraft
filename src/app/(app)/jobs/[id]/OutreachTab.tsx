"use client";

import { useState } from "react";
import { AlertCircle, ArrowUpRight, BadgeCheck, Send, Sparkles, UserPlus, RotateCcw, UserSearch } from "lucide-react";
import type { Application } from "@/lib/types";
import type { Analysis, Outreach } from "@/lib/tasks";
import { CopyButton, Spinner, Working, useAsk } from "@/components/client-ui";
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

  const meters = o
    ? [
        { key: "note", title: "Connection note", icon: <UserPlus size={15} />, text: o.connection_note, used: o.connection_note.length, max: 250, unit: "chars" },
        { key: "msg", title: "Message", icon: <Send size={15} />, text: o.message, used: words(o.message), max: 110, unit: "words" },
      ]
    : [];

  return (
    <div className="grid items-stretch gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      {dialog}
      {/* Left: find + write */}
      <aside className="flex flex-col gap-4">
        <section className="dark-card p-5">
          <div className="flex items-center gap-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-white/85"><UserSearch size={14} /> 1 · Find who hires</div>
          {app.hiring_contact && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-[0.88rem]">
              <BadgeCheck size={15} className="shrink-0 text-mustard" /> <span>Named in the post: <b className="font-semibold">{app.hiring_contact}</b></span>
            </div>
          )}
          <div className="mt-4 text-[0.78rem] text-white/80">Hiring manager</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {titles.map((t) => (
              <a key={t} href={people(`${t} ${company}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-cream px-3 py-1.5 text-[0.82rem] font-semibold text-side transition hover:bg-mustard">{t} <ArrowUpRight size={12} /></a>
            ))}
          </div>
          <div className="mt-3 text-[0.78rem] text-white/80">Recruiters</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {["Talent Acquisition", "Recruiter", "HR Business Partner"].map((t) => (
              <a key={t} href={people(`${t} ${company}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-[0.82rem] font-medium text-white/85 transition hover:bg-white/10">{t} <ArrowUpRight size={12} /></a>
            ))}
          </div>
          <p className="mt-3 text-[0.76rem] text-white/85">Opens LinkedIn people search at {company}.</p>
        </section>

        <section className="card flex-1 p-5">
          <div className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-muted">2 · Write to them</div>
          <label className="label mt-3">Who did you find? <span className="text-faint">· optional</span></label>
          <input className="field" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. Priya Sharma, Head of Category" />
          <button className="btn btn-clay mt-3 h-11 w-full" onClick={async () => { if (o && (await ask({ title: "Rewrite messages?", body: "New messages replace the current ones. Uses AI credit.", confirm: "Rewrite" })) === null) return; generate(); }} disabled={busy}>
            {busy ? <Spinner /> : o ? <RotateCcw size={15} /> : <Sparkles size={15} />} {o ? "Rewrite messages" : "Write messages"}
          </button>
          {error && <p className="mt-2 flex items-center gap-1.5 text-sm text-bad"><AlertCircle size={14} /> {error}</p>}
        </section>
      </aside>

      {/* Right: the messages */}
      <div className="min-w-0">
        {busy && !o ? (
          <Working title="Writing your messages" steps={["Finding a real challenge they face...", "Matching it to your strongest result...", "Keeping it short and human..."]} />
        ) : o ? (
          <div className={`grid items-stretch gap-5 md:grid-cols-2 stagger transition ${busy ? "opacity-50" : ""}`}>
            {meters.map((m) => {
              const over = m.used > m.max;
              return (
                <section key={m.key} className="card flex flex-col p-5">
                  <header className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-soft text-brand">{m.icon}</span>
                    <h3 className="flex-1 text-[1.2rem] font-bold">{m.title}</h3>
                    <span className={`text-[0.8rem] font-semibold tabular-nums ${over ? "text-bad" : "text-muted"}`}>{m.used}/{m.max} {m.unit}</span>
                  </header>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line-2"><div className={`h-full rounded-full ${over ? "bg-bad" : "bg-good"}`} style={{ width: `${Math.min(100, (m.used / m.max) * 100)}%` }} /></div>
                  <p className="mt-4 flex-1 whitespace-pre-wrap rounded-2xl bg-line-2/60 p-4 leading-relaxed">{m.text}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[0.8rem] font-medium text-bad">{over ? "Over the limit - trim it" : ""}</span>
                    <CopyButton text={m.text} />
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="grid h-full gap-4 md:grid-cols-2">
            {[
              { icon: <UserPlus size={18} />, tone: "bg-brand-soft text-brand", title: "Connection note", limit: "Under 250 characters", lines: [92, 100, 78, 55], bar: 70 },
              { icon: <Send size={18} />, tone: "bg-mustard-soft text-mustard-ink", title: "Message", limit: "Under 110 words", lines: [100, 96, 88, 100, 92, 70, 84, 40], bar: 55 },
            ].map((x) => (
              <div key={x.title} className="card flex flex-col p-5">
                <div className="flex items-center gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-full ${x.tone}`}>{x.icon}</span>
                  <span>
                    <span className="block font-display text-[1.1rem] font-bold">{x.title}</span>
                    <span className="block text-[0.8rem] text-muted">{x.limit}</span>
                  </span>
                </div>
                <div className="mt-5 flex-1 space-y-2.5 rounded-2xl border-[1.5px] border-dashed border-line p-4">
                  {x.lines.map((w, i) => <span key={i} className="block h-2.5 rounded-full bg-line-2" style={{ width: `${w}%` }} />)}
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line-2"><div className="h-full rounded-full bg-line" style={{ width: `${x.bar}%` }} /></div>
                <p className="mt-2 text-[0.8rem] text-muted">Appears here when you click <b className="text-ink">Write messages</b>.</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
