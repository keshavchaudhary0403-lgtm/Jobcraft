"use client";

import { useState } from "react";
import { AlertCircle, ExternalLink, Pin, RotateCcw, Sparkles } from "lucide-react";
import type { LinkedInResult } from "@/lib/tasks";
import { CharCount, CopyButton, Spinner, Working } from "@/components/client-ui";
import { useGenerate } from "@/components/useGenerate";

export function LinkedInClient({ initial, targetRole, url }: { initial: LinkedInResult | null; targetRole: string; url: string | null }) {
  const [res, setRes] = useState(initial);
  const [role, setRole] = useState(targetRole);
  const { run, busy, error } = useGenerate<LinkedInResult>("linkedin");

  async function generate() {
    const r = await run({ role });
    if (r) setRes(r);
  }

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-end gap-3 p-5 fade-up">
        <div className="min-w-[240px] flex-1">
          <label className="label">Target role</label>
          <input className="field" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Product Manager in fintech" />
        </div>
        {url && <a className="btn btn-ghost" href={url} target="_blank" rel="noreferrer">My profile <ExternalLink size={14} /></a>}
        <button className="btn btn-brand" disabled={busy || !role.trim()} onClick={generate}>
          {busy ? <Spinner /> : res ? <RotateCcw size={15} /> : <Sparkles size={15} />} {res ? "Rewrite" : "Rewrite my LinkedIn"}
        </button>
      </div>
      {error && <p className="flex items-center gap-1.5 text-sm text-bad"><AlertCircle size={14} /> {error}</p>}
      {busy && !res && <Working steps={["Finding what recruiters search for…", "Writing headlines…", "Writing your About section…"]} />}

      {res && (
        <div className={`space-y-5 stagger transition ${busy ? "opacity-50" : ""}`}>
          <section className="card p-6">
            <div className="text-xs font-medium uppercase tracking-wider text-faint">Headline — pick one</div>
            <div className="mt-3 space-y-3">
              {res.headlines.map((h, i) => (
                <div key={i} className="group flex items-start gap-3 rounded-xl border border-line p-4 transition hover:border-brand/40">
                  <p className="flex-1 text-[0.95rem] leading-relaxed">{h}</p>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <CharCount text={h} max={220} />
                    <CopyButton text={h} />
                  </div>
                </div>
              ))}
            </div>
          </section>
          <div className="grid gap-5 md:grid-cols-[1.6fr_1fr]">
            <section className="card flex flex-col p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-faint">About</span>
                <span className="text-xs tabular-nums text-faint">{res.about.trim().split(/\s+/).length}/150 words</span>
              </div>
              <p className="mt-3 flex-1 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-slate-700">{res.about}</p>
              <div className="mt-4"><CopyButton text={res.about} /></div>
            </section>
            <section className="card p-6">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-faint"><Pin size={12} /> Skills to pin</div>
              <ol className="mt-3 space-y-2">
                {res.skills.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-xs font-semibold tabular-nums text-faint">{i + 1}</span> {s}
                  </li>
                ))}
              </ol>
              <div className="mt-4"><CopyButton text={res.skills.join(", ")} label="Copy all" /></div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
