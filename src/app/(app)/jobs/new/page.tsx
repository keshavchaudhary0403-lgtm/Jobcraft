"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, Link2, Send, Sparkles, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/client-ui";

export default function NewJob() {
  const router = useRouter();
  const [jd, setJd] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("applications")
      .insert({ user_id: user!.id, jd: jd.trim(), job_url: url.trim() || null })
      .select("id")
      .single();
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    router.push(`/jobs/${data.id}`);
  }

  const words = jd.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div>
      <div className="mb-8 fade-up">
        <h1 className="text-[1.75rem] font-semibold tracking-tight">Add a job</h1>
        <p className="mt-1 text-muted">Paste the job description from LinkedIn, Naukri or anywhere.</p>
      </div>
      <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="card overflow-hidden fade-up">
          <textarea
            autoFocus
            required
            className="block min-h-[min(68vh,640px)] w-full resize-none border-0 bg-transparent p-7 text-[0.95rem] leading-relaxed outline-none placeholder:text-faint"
            placeholder="Paste the full job description here…"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
          <div className="flex items-center justify-between border-t border-line bg-slate-50/60 px-5 py-2.5 text-xs text-faint">
            <span className="tabular-nums">{words} words</span>
            {words > 0 && words < 30 && <span className="text-mid">Paste the full description</span>}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 stagger">
          <div className="card p-5">
            <label className="label">Job link <span className="text-faint">(optional)</span></label>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 focus-within:border-brand">
              <Link2 size={16} className="shrink-0 text-faint" />
              <input className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-faint" placeholder="linkedin.com/jobs/…" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <button className="btn btn-brand mt-4 w-full py-3" disabled={busy || words < 30}>
              {busy ? <Spinner /> : <Sparkles size={16} />} Analyse job <ArrowRight size={16} />
            </button>
            {err && <p className="mt-3 text-sm text-bad">{err}</p>}
          </div>
          <div className="card p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-faint">You&apos;ll get</div>
            <ul className="mt-3 space-y-3 text-sm">
              {[
                { icon: Target, t: "Your match score", s: "and what's missing" },
                { icon: FileText, t: "A resume for this job", s: "ATS-safe, only true facts" },
                { icon: Send, t: "Outreach messages", s: "for the hiring manager" },
              ].map(({ icon: Icon, t, s: sub }) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand-ink"><Icon size={15} /></span>
                  <span><span className="block font-medium">{t}</span><span className="block text-xs text-muted">{sub}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </form>
    </div>
  );
}
