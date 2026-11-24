"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Award, Check, ExternalLink, FileText, MapPin, RotateCcw, Sparkles, IdCard } from "lucide-react";
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

  const rewrite = async () => {
    if (res && (await ask({ title: "Rewrite your LinkedIn?", body: "New headlines, About and skills replace the current ones. Uses AI credit.", confirm: "Rewrite" })) === null) return;
    generate();
  };
  const aboutWords = res ? res.about.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-5">
      {dialog}
      <header className="flex flex-wrap items-end justify-between gap-4 pt-2 fade-up">
        <div>
          <h1 className="text-[2.6rem] font-bold leading-none">LinkedIn<span className="text-clay">.</span></h1>
          <p className="mt-2 text-[1rem] leading-relaxed text-muted">
            Written to be found for <span className="font-semibold text-ink">{targetRole || "your next role"}</span>{" "}
            <Link href="/profile" className="ml-1 inline-block rounded-full border-[1.5px] border-line px-2.5 py-0.5 align-middle text-[0.8rem] font-semibold text-ink hover:border-brand/40">Change</Link>
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
          {url && <a className="btn btn-ghost h-11" href={url} target="_blank" rel="noreferrer">Open my profile <ExternalLink size={14} /></a>}
          <button className="btn btn-clay h-11" disabled={busy} onClick={rewrite}>
            {busy ? <Spinner /> : res ? <RotateCcw size={15} /> : <Sparkles size={15} />} {res ? "Rewrite" : "Write my LinkedIn"}
          </button>
        </div>
      </header>
      {error && <p className="flex items-center gap-1.5 text-bad"><AlertCircle size={14} /> {error}</p>}

      <div className={`grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] transition ${busy ? "opacity-60" : ""}`}>
        {/* Live preview */}
        <section className="card overflow-hidden fade-up">
          <div className="grain relative h-32" style={{ background: "linear-gradient(120deg, var(--side), var(--side-2) 55%, var(--brand))" }}>
            <span className="absolute right-5 top-4 rounded-full bg-white/10 px-3 py-1 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-cream/80">Live preview</span>
          </div>
          <div className="px-7 pb-7">
            <div className="relative z-10 -mt-12 grid h-24 w-24 place-items-center rounded-full border-[5px] border-card avatar-warm font-display text-[1.9rem] font-bold">{initials}</div>
            <div className="mt-3 font-display text-[1.9rem] font-bold leading-tight">{name}</div>
            {headline ? (
              <p key={headline} className="mt-1 max-w-3xl text-[1.02rem] leading-snug fade-up">{headline}</p>
            ) : (
              <div className="mt-2 space-y-1.5"><div className={`h-3 w-3/4 rounded ${busy ? "skeleton" : "bg-line-2"}`} /><div className={`h-3 w-1/2 rounded ${busy ? "skeleton" : "bg-line-2"}`} /></div>
            )}
            <div className="mt-2 flex items-center gap-1 text-[0.88rem] text-muted">{city && <><MapPin size={13} /> {city}</>}{title && <span className="ml-2">· {title}</span>}</div>

            <div className="mt-6 grid gap-6 border-t border-line pt-6 xl:grid-cols-[minmax(0,1fr)_240px]">
              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="flex items-center gap-2.5 text-[1.2rem] font-bold"><span data-tone="1" className="tone-chip grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-line-2 text-brand"><FileText size={15} /></span>About</h2>
                  {res && <span className="flex items-center gap-2"><CharCount text={res.about} max={150} unit="words" /><CopyButton text={res.about} /></span>}
                </div>
                {res ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{res.about}</p>
                ) : (
                  <div className="space-y-2">{[90, 100, 95, 70].map((w, i) => <div key={i} className={`h-3 rounded ${busy ? "skeleton" : "bg-line-2"}`} style={{ width: `${w}%` }} />)}</div>
                )}
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2.5 text-[1.2rem] font-bold"><span data-tone="3" className="tone-chip grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-line-2 text-brand"><Award size={15} /></span>Top skills</h2>
                  {res && <CopyButton text={res.skills.join(", ")} label="Copy" />}
                </div>
                <ol className="space-y-2">
                  {res
                    ? res.skills.map((s, i) => (
                        <li key={s} className="flex items-center gap-2.5 rounded-2xl border-[1.5px] border-line px-3 py-2 text-[0.9rem] font-medium">
                          <span data-tone={i % 5} className="tone-chip grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mustard-soft font-display text-[0.78rem] font-bold text-mustard-ink">{i + 1}</span>{s}
                        </li>
                      ))
                    : [0, 1, 2, 3, 4].map((i) => <li key={i} className={`h-10 rounded-2xl ${busy ? "skeleton" : "bg-line-2"}`} />)}
                </ol>
                {res && (
                  <div data-tone="2" className="tone-soft mt-4 rounded-2xl px-4 py-3" style={{ background: "var(--color-cream)" }}>
                    <div className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted">About length</div>
                    <div className="mt-1 font-display text-[1.4rem] font-bold">{aboutWords}<span className="text-[0.85rem] font-medium text-muted"> / 150 words</span></div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${aboutWords > 150 ? "bg-bad" : "bg-good"}`} style={{ width: `${Math.min(100, (aboutWords / 150) * 100)}%` }} /></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right rail: headlines + update steps */}
        <aside className="space-y-5 lg:sticky lg:top-6">
          <section className="card p-5 fade-up">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2.5 text-[1.2rem] font-bold"><span data-tone="0" className="tone-chip grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-line-2 text-brand"><IdCard size={15} /></span>Pick a headline</h2>
              {headline && <CopyButton text={headline} label="Copy" />}
            </div>
            {res ? (
              <div className="space-y-2">
                {res.headlines.map((h, i) => {
                  const on = pick === i;
                  return (
                    <button key={i} type="button" onClick={() => setPick(i)} className={`w-full rounded-[18px] border-[1.5px] p-3.5 text-left transition ${on ? "border-side bg-side text-cream" : "border-line hover:border-brand/40"}`}>
                      <div className="mb-1.5 flex items-center gap-2 text-[0.8rem]">
                        <span data-tone={on ? undefined : i % 5} className={`tone-chip grid h-6 w-6 place-items-center rounded-full font-display font-bold ${on ? "bg-mustard text-white" : "bg-line-2 text-muted"}`}>{on ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
                        <span className={`ml-auto ${on ? "text-cream/60" : ""}`}><CharCount text={h} max={220} /></span>
                      </div>
                      <div className="text-[0.9rem] leading-snug">{h}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className={`h-[74px] rounded-[18px] ${busy ? "skeleton" : "border-[1.5px] border-dashed border-line"}`} />)}</div>
            )}
          </section>
          {res && <UpdateChecklist url={url} headline={headline ?? ""} about={res.about} skills={res.skills} />}
        </aside>
      </div>
    </div>
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
    { k: "headline", title: "Replace your headline", how: "Profile → pencil icon next to your name → Headline. Paste the option you picked.", action: <CopyButton text={headline} label="Copy" /> },
    { k: "about", title: "Replace your About section", how: "Profile → About → pencil icon. Paste, then check the first two lines read well on their own.", action: <CopyButton text={about} label="Copy" /> },
    { k: "skills", title: "Add the 5 skills", how: "Profile → Skills → Add skill. Add each one; remove skills you no longer want to be found for.", action: <CopyButton text={skills.join(", ")} label="Copy" /> },
    { k: "pin", title: "Pin your top skills", how: "Skills → pencil → drag these 5 to the top so recruiters see them first." },
    { k: "open", title: "Turn on Open to Work (recruiters only)", how: "Profile → Open to → Finding a new job → choose 'Recruiters only' and add your target role." },
  ];
  return (
    <section className="card p-5 fade-up">
      <div className="flex items-center gap-3">
        <div className="donut-3d relative grid h-14 w-14 shrink-0 place-items-center">
          <svg width="56" height="56" className="-rotate-90">
            <circle cx="28" cy="28" r="23" fill="none" stroke="var(--line-2)" strokeWidth="6" />
            <circle cx="28" cy="28" r="23" fill="none" stroke="var(--color-good)" strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 23} strokeDashoffset={2 * Math.PI * 23 * (1 - n / STEPS.length)} style={{ transition: "stroke-dashoffset .6s ease" }} />
          </svg>
          <span className="absolute font-display text-[0.95rem] font-bold">{n}/{STEPS.length}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[1.2rem] font-bold leading-tight">Put it live</h2>
          <div className="text-[0.8rem] text-muted">About 5 minutes</div>
        </div>
        {url && <a href={url} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-line text-muted hover:text-ink" aria-label="Open LinkedIn"><ExternalLink size={14} /></a>}
      </div>
      <ol className="mt-4 space-y-1">
        {items.map((it) => (
          <li key={it.k} className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition hover:bg-line-2/60" title={it.how}>
            <button
              onClick={() => toggle(it.k)}
              aria-pressed={!!done[it.k]}
              aria-label={done[it.k] ? "Mark not done" : "Mark done"}
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${done[it.k] ? "border-good bg-good text-white" : "border-line bg-card text-transparent hover:border-good/50"}`}
            >
              <Check size={12} strokeWidth={3} />
            </button>
            <div className="min-w-0 flex-1">
              <div className={`text-[0.88rem] font-semibold leading-snug ${done[it.k] ? "text-muted line-through decoration-line" : ""}`}>{it.title}</div>
            </div>
            {it.action && <div className="shrink-0 [&_button]:h-8 [&_button]:px-2.5 [&_button]:text-[0.78rem]">{it.action}</div>}
          </li>
        ))}
      </ol>
    </section>
  );
}
