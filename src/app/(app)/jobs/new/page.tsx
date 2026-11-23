"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Link2, Sparkles } from "lucide-react";
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
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 fade-up">
        <h1 className="text-[1.75rem] font-semibold tracking-tight">Add a job</h1>
        <p className="mt-1 text-muted">Paste the job description from LinkedIn, Naukri or anywhere.</p>
      </div>
      <form onSubmit={submit} className="card overflow-hidden fade-up">
        <textarea
          autoFocus
          required
          className="block min-h-[22rem] w-full resize-y border-0 bg-transparent p-6 text-[0.95rem] leading-relaxed outline-none placeholder:text-faint"
          placeholder="Paste the full job description here…"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3 border-t border-line bg-slate-50/60 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3 focus-within:border-brand">
            <Link2 size={16} className="shrink-0 text-faint" />
            <input className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-faint" placeholder="Job link (optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <span className="hidden text-xs tabular-nums text-faint sm:block">{words} words</span>
          <button className="btn btn-brand" disabled={busy || words < 30}>
            {busy ? <Spinner /> : <Sparkles size={16} />} Analyse <ArrowRight size={16} />
          </button>
        </div>
      </form>
      {err && <p className="mt-3 text-sm text-bad">{err}</p>}
      {words > 0 && words < 30 && <p className="mt-3 text-sm text-muted">Paste the full description — at least a few paragraphs.</p>}
    </div>
  );
}
