"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, ExternalLink, ListChecks, MapPin, RotateCcw, Sparkles } from "lucide-react";
import type { LinkedInResult } from "@/lib/tasks";
import { CharCount, CopyButton, Spinner, useAsk } from "@/components/client-ui";
import { useGenerate } from "@/components/useGenerate";

type Props = { initial: LinkedInResult | null; name: string; title: string; city: string; targetRole: string; url: string | null };

export function LinkedInClient({ initial, name, title, city, targetRole, url }: Props) {
  const [res, setRes] = useState(initial);
  const [pick, setPick] = useState(0);
  const { run, busy, error } = useGenerate<LinkedInResult>("linkedin");
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const [ask, dialog] = useAsk();
  async function generate() {
    const r = await run({ role: targetRole });
    if (r) {
      setRes(r);
      setPick(0);
    }
  }

  const headline = res?.headlines[pick];

  return (
    <>
      {dialog}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 fade-up">
        <div>
          <h1 className="text-[24px] font-semibold leading-tight">LinkedIn</h1>
          <p className="mt-0.5 text-muted">
            Optimised for <span className="font-medium text-ink">{targetRole || "your next role"}</span>
            <Link href="/profile" className="pill-link ml-2 h-6 px-2.5 text-[12px]">Change</Link>
          </p>
        </div>
        <div className="flex gap-2">
          {url && <a className="btn btn-ghost" href={url} target="_blank" rel="noreferrer">Open my profile <ExternalLink size={14} /></a>}
          <button className="btn btn-brand" disabled={busy} onClick={async () => { if (res && (await ask({ title: "Rewrite your LinkedIn?", body: "New headlines, About and skills replace the current ones. Uses AI credit.", confirm: "Rewrite" })) === null) return; generate(); }}>
            {busy ? <Spinner /> : res ? <RotateCcw size={15} /> : <Sparkles size={15} />} {res ? "Rewrite" : "Write my LinkedIn"}
          </button>
        </div>
      </div>
      {error && <p className="mb-4 flex items-center gap-1.5 text-bad"><AlertCircle size={14} /> {error}</p>}

      <div className={`grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px] transition ${busy ? "opacity-60" : ""}`}>
        {/* Live preview */}
        <section className="card overflow-hidden fade-up">
          <div className="h-28 bg-gradient-to-r from-brand via-brand to-brand-2" />
          <div className="px-6 pb-6">
            <div className="-mt-11 grid h-[88px] w-[88px] place-items-center rounded-full border-4 border-white bg-gradient-to-br from-brand to-brand-2 text-[24px] font-semibold text-white">{initials}</div>
            <div className="mt-3 text-[20px] font-semibold">{name}</div>
            {headline ? (
              <p key={headline} className="mt-0.5 max-w-2xl leading-snug text-slate-700 fade-up">{headline}</p>
            ) : (
              <div className="mt-2 space-y-1.5"><div className={`h-3 w-3/4 rounded ${busy ? "skeleton" : "bg-line-2"}`} /><div className={`h-3 w-1/2 rounded ${busy ? "skeleton" : "bg-line-2"}`} /></div>
            )}
            <div className="mt-2 flex items-center gap-1 text-[14px] text-muted">{city && <><MapPin size={13} /> {city}</>}{title && <span className="ml-2">· {title}</span>}</div>

            <div className="mt-6 border-t border-line pt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">About</span>
                {res && <span className="flex items-center gap-2"><CharCount text={res.about} max={150} unit="words" /><CopyButton text={res.about} /></span>}
              </div>
              {res ? (
                <p className="whitespace-pre-wrap leading-[1.43] text-slate-700">{res.about}</p>
              ) : (
                <div className="space-y-2">{[90, 100, 95, 70].map((w, i) => <div key={i} className={`h-3 rounded ${busy ? "skeleton" : "bg-line-2"}`} style={{ width: `${w}%` }} />)}</div>
              )}
            </div>

            <div className="mt-6 border-t border-line pt-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold">Top skills</span>
                {res && <CopyButton text={res.skills.join(", ")} label="Copy all" />}
              </div>
              <div className="flex flex-wrap gap-2">
                {res
                  ? res.skills.map((s) => <span key={s} className="chip border border-line bg-white px-3 py-1 text-[14px] text-slate-700">{s}</span>)
                  : [80, 110, 90, 70, 100].map((w, i) => <span key={i} className={`h-7 rounded-full ${busy ? "skeleton" : "bg-line-2"}`} style={{ width: w }} />)}
              </div>
            </div>
          </div>
        </section>

        {/* Headline options */}
        <aside className="card p-5 xl:sticky xl:top-6 fade-up">
          <div className="card-head"><span className="ico"><Sparkles size={15} /></span>Headline options</div>
          {res ? (
            <div className="space-y-2.5">
              {res.headlines.map((h, i) => (
                <button key={i} type="button" data-on={pick === i} onClick={() => setPick(i)} className="option w-full p-3.5">
                  <div className="mb-1.5 flex items-center justify-between text-[12px] text-faint">
                    <span>Option {i + 1}</span>
                    <CharCount text={h} max={220} />
                  </div>
                  <div className="leading-snug">{h}</div>
                </button>
              ))}
              {headline && <CopyButton text={headline} label="Copy selected" className="mt-1 w-full" />}
            </div>
          ) : (
            <div className="space-y-2.5">{[0, 1, 2].map((i) => <div key={i} className={`h-[74px] rounded-xl ${busy ? "skeleton" : "border border-dashed border-line"}`} />)}</div>
          )}
        </aside>
      </div>
      {res && <div className="mt-5"><UpdateChecklist url={url} headline={headline ?? ""} about={res.about} skills={res.skills} /></div>}
    </>
  );
}

const STEPS = ["headline", "about", "skills", "pin", "open"] as const;

/** Step-by-step: put the new content on LinkedIn. Progress is remembered on this device. */
function UpdateChecklist({ url, headline, about, skills }: { url: string | null; headline: string; about: string; skills: string[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(JSON.parse(localStorage.getItem("jc-li-steps") ?? "{}"));
    } catch {}
  }, []);
  const toggle = (k: string) => {
    const next = { ...done, [k]: !done[k] };
    setDone(next);
    localStorage.setItem("jc-li-steps", JSON.stringify(next));
  };
  const n = STEPS.filter((k) => done[k]).length;
  const items: { k: (typeof STEPS)[number]; title: string; how: string; action?: React.ReactNode }[] = [
    { k: "headline", title: "Replace your headline", how: "Profile → pencil icon next to your name → Headline. Paste the option you picked.", action: <CopyButton text={headline} label="Copy headline" /> },
    { k: "about", title: "Replace your About section", how: "Profile → About → pencil icon. Paste, then check the first two lines read well on their own.", action: <CopyButton text={about} label="Copy About" /> },
    { k: "skills", title: "Add the 5 skills", how: "Profile → Skills → Add skill. Add each one; remove skills you no longer want to be found for.", action: <CopyButton text={skills.join(", ")} label="Copy skills" /> },
    { k: "pin", title: "Pin your top skills", how: "Skills → pencil → drag these 5 to the top so recruiters see them first." },
    { k: "open", title: "Turn on Open to Work (recruiters only)", how: "Profile → Open to → Finding a new job → choose 'Recruiters only' and add your target role." },
  ];
  return (
    <section className="card overflow-hidden fade-up">
      <div className="flex items-center gap-2.5 border-b border-line bg-line-2/40 px-5 py-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-brand"><ListChecks size={15} /></span>
        <div className="flex-1">
          <div className="font-semibold">Update your LinkedIn — about 5 minutes</div>
          <div className="text-[12px] text-muted">Recruiters search by headline and skills, so these steps matter most.</div>
        </div>
        <span className={`chip ${n === STEPS.length ? "bg-good-soft text-good" : "bg-line-2 text-muted"}`}>{n} of {STEPS.length} done</span>
        {url && <a href={url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Open LinkedIn <ExternalLink size={13} /></a>}
      </div>
      <div className="divide-y divide-line">
        {items.map((it, i) => (
          <div key={it.k} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
            <button
              onClick={() => toggle(it.k)}
              aria-pressed={!!done[it.k]}
              aria-label={done[it.k] ? "Mark not done" : "Mark done"}
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition ${done[it.k] ? "border-brand bg-brand text-white" : "border-line bg-white text-transparent hover:border-brand/50"}`}
            >
              <Check size={14} strokeWidth={3} />
            </button>
            <div className="min-w-0 flex-1">
              <div className={`font-semibold ${done[it.k] ? "text-muted line-through decoration-line" : ""}`}>{i + 1}. {it.title}</div>
              <div className="text-[14px] text-muted">{it.how}</div>
            </div>
            {it.action}
          </div>
        ))}
      </div>
    </section>
  );
}
