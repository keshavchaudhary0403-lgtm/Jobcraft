"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ExternalLink, MapPin, RotateCcw, Sparkles } from "lucide-react";
import type { LinkedInResult } from "@/lib/tasks";
import { CharCount, CopyButton, Spinner } from "@/components/client-ui";
import { useGenerate } from "@/components/useGenerate";

type Props = { initial: LinkedInResult | null; name: string; title: string; city: string; targetRole: string; url: string | null };

export function LinkedInClient({ initial, name, title, city, targetRole, url }: Props) {
  const [res, setRes] = useState(initial);
  const [pick, setPick] = useState(0);
  const { run, busy, error } = useGenerate<LinkedInResult>("linkedin");
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 fade-up">
        <div>
          <h1 className="text-[1.6rem] font-semibold leading-tight tracking-tight">LinkedIn</h1>
          <p className="mt-0.5 text-muted">
            Optimised for <span className="font-medium text-ink">{targetRole || "your next role"}</span> ·{" "}
            <Link href="/profile" className="text-brand-ink hover:underline">change</Link>
          </p>
        </div>
        <div className="flex gap-2">
          {url && <a className="btn btn-ghost" href={url} target="_blank" rel="noreferrer">Open my profile <ExternalLink size={14} /></a>}
          <button className="btn btn-brand" disabled={busy} onClick={generate}>
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
            <div className="-mt-11 grid h-[88px] w-[88px] place-items-center rounded-full border-4 border-white bg-gradient-to-br from-brand to-brand-2 text-2xl font-semibold text-white">{initials}</div>
            <div className="mt-3 text-[1.35rem] font-semibold">{name}</div>
            {headline ? (
              <p key={headline} className="mt-0.5 max-w-2xl leading-snug text-slate-700 fade-up">{headline}</p>
            ) : (
              <div className="mt-2 space-y-1.5"><div className={`h-3 w-3/4 rounded ${busy ? "skeleton" : "bg-line-2"}`} /><div className={`h-3 w-1/2 rounded ${busy ? "skeleton" : "bg-line-2"}`} /></div>
            )}
            <div className="mt-2 flex items-center gap-1 text-[0.88rem] text-muted">{city && <><MapPin size={13} /> {city}</>}{title && <span className="ml-2">· {title}</span>}</div>

            <div className="mt-6 border-t border-line pt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">About</span>
                {res && <span className="flex items-center gap-2"><CharCount text={res.about} max={150} unit="words" /><CopyButton text={res.about} /></span>}
              </div>
              {res ? (
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{res.about}</p>
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
                  ? res.skills.map((s) => <span key={s} className="chip border border-line bg-white px-3 py-1 text-[0.88rem] text-slate-700">{s}</span>)
                  : [80, 110, 90, 70, 100].map((w, i) => <span key={i} className={`h-7 rounded-full ${busy ? "skeleton" : "bg-line-2"}`} style={{ width: w }} />)}
              </div>
            </div>
          </div>
        </section>

        {/* Headline options */}
        <aside className="card p-5 xl:sticky xl:top-6 fade-up">
          <div className="mb-3 font-semibold">Headline</div>
          {res ? (
            <div className="space-y-2.5">
              {res.headlines.map((h, i) => (
                <button key={i} type="button" data-on={pick === i} onClick={() => setPick(i)} className="option w-full p-3.5">
                  <div className="mb-1.5 flex items-center justify-between text-[0.78rem] text-faint">
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
    </>
  );
}
