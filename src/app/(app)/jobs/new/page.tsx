"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, DownloadCloud, Link2, MapPin, Sparkles, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/client-ui";
import type { DetectedJob } from "@/lib/tasks";

type Fields = { company: string; role: string; location: string; company_type: string };

export default function NewJob() {
  const router = useRouter();
  const [jd, setJd] = useState("");
  const [url, setUrl] = useState("");
  const [f, setF] = useState<Fields>({ company: "", role: "", location: "", company_type: "" });
  const [auto, setAuto] = useState<Partial<Record<keyof Fields, boolean>>>({});
  const [detecting, setDetecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function fromLink() {
    if (!url.trim()) return;
    setFetching(true);
    setFetchMsg(null);
    const res = await fetch("/api/jobs/fetch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
    const data = await res.json().catch(() => ({ error: "Something went wrong." }));
    setFetching(false);
    if (!res.ok) return setFetchMsg({ ok: false, text: data.error });
    setJd(data.jd);
    setUrl(data.url ?? url);
    const next: Partial<Fields> = {};
    const flags: Partial<Record<keyof Fields, boolean>> = {};
    (["company", "role", "location"] as const).forEach((k) => {
      if (data[k] && !edited.current.has(k)) {
        next[k] = data[k];
        flags[k] = true;
      }
    });
    setF((x) => ({ ...x, ...next }));
    setAuto((x) => ({ ...x, ...flags }));
    setFetchMsg({ ok: true, text: "Description added from the link — check it reads right." });
  }
  const lastDetected = useRef("");
  const edited = useRef<Set<keyof Fields>>(new Set());

  const words = jd.trim().split(/\s+/).filter(Boolean).length;

  // After a paste, read company / role / location from the JD (cheap model). User can edit anything.
  useEffect(() => {
    if (words < 30) return;
    const key = jd.trim().slice(0, 600);
    if (key === lastDetected.current) return;
    const t = setTimeout(async () => {
      lastDetected.current = key;
      setDetecting(true);
      const res = await fetch("/api/jobs/detect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jd }) });
      const { data } = (await res.json().catch(() => ({}))) as { data: DetectedJob | null };
      setDetecting(false);
      if (!data) return;
      const next: Partial<Fields> = {};
      const flags: Partial<Record<keyof Fields, boolean>> = {};
      (["company", "role", "location", "company_type"] as const).forEach((k) => {
        if (data[k] && !edited.current.has(k)) {
          next[k] = data[k]!;
          flags[k] = true;
        }
      });
      setF((x) => ({ ...x, ...next }));
      setAuto((x) => ({ ...x, ...flags }));
    }, 700);
    return () => clearTimeout(t);
  }, [jd, words]);

  const set = (k: keyof Fields, v: string) => {
    edited.current.add(k);
    setAuto((x) => ({ ...x, [k]: false }));
    setF((x) => ({ ...x, [k]: v }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    const { data, error } = await supabase
      .from("applications")
      .insert({
        user_id: user!.id,
        jd: jd.trim(),
        job_url: url.trim() || null,
        company: f.company.trim(),
        role: f.role.trim(),
        location: f.location.trim() || null,
        company_type: f.company_type.trim() || null,
      })
      .select("id")
      .single();
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    router.push(`/jobs/${data.id}`);
  }

  const ready = words >= 30 && f.company.trim() && f.role.trim();

  const detField = (k: keyof Fields, label: string, icon: React.ReactNode, placeholder: string) => {
    return (
      <div key={k}>
        <label className="label flex items-center justify-between">
          <span>{label}</span>
          {auto[k] && <span className="chip bg-brand-soft px-1.5 py-0 text-[0.72rem] text-brand-ink"><Sparkles size={10} /> from JD</span>}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">{icon}</span>
          {detecting && !f[k] ? (
            <div className="skeleton h-[2.6rem] w-full rounded-[10px]" />
          ) : (
            <input className="field pl-9" value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6 fade-up">
        <h1 className="text-[1.6rem] font-semibold leading-tight tracking-tight">Add a job</h1>
        <p className="mt-0.5 text-muted">Paste the description. We&apos;ll pick out the company and role — you confirm.</p>
      </div>
      <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="card overflow-hidden fade-up">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="font-bold">Job description</span>
            <span className="text-[0.82rem] tabular-nums text-faint">{words} words</span>
          </div>
          <div className="border-b border-line bg-line-2/40 px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Link2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  className="field h-10 pl-9"
                  placeholder="Have a link? Paste the job page (company careers, Lever, Greenhouse…)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      fromLink();
                    }
                  }}
                />
              </div>
              <button type="button" className="btn btn-ghost h-10" disabled={!url.trim() || fetching} onClick={fromLink}>
                {fetching ? <Spinner size={14} /> : <DownloadCloud size={15} />} Get description
              </button>
            </div>
            {fetchMsg && <p className={`mt-2 text-[0.84rem] ${fetchMsg.ok ? "text-good" : "text-mid"}`}>{fetchMsg.text}</p>}
          </div>
          <textarea
            autoFocus
            required
            className="thin-scroll block h-[min(58vh,560px)] w-full resize-none border-0 bg-transparent px-5 py-4 text-[0.97rem] leading-relaxed outline-none placeholder:text-faint"
            placeholder="…or paste the full job description here (LinkedIn, Naukri, any site)"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
        </div>

        <aside className="card p-5 lg:sticky lg:top-6 fade-up">
          <div className="card-head">
            <span className="ico"><Building2 size={15} /></span>
            <span className="flex-1">Job details</span>
            {detecting && <span className="flex items-center gap-1.5 text-[0.82rem] font-normal text-muted"><Spinner size={13} /> Reading…</span>}
          </div>
          <div className="space-y-4">
          {detField("company", "Company", <Building2 size={15} />, words < 30 ? "Filled from the JD" : "Company name")}
          {detField("role", "Role", <UserRound size={15} />, words < 30 ? "Filled from the JD" : "Job title")}
          {detField("location", "Location", <MapPin size={15} />, "Optional")}
          <button className="btn btn-brand w-full" disabled={busy || !ready}>
            {busy ? <Spinner /> : <Sparkles size={15} />} Analyse job <ArrowRight size={15} />
          </button>
          {words >= 30 && !detecting && (!f.company || !f.role) && <p className="text-[0.85rem] text-mid">Add the company and role — they weren&apos;t in the text.</p>}
          {err && <p className="text-[0.85rem] text-bad">{err}</p>}
          </div>
        </aside>
      </form>
    </div>
  );
}
