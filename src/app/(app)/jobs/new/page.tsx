"use client";

import { formatCity, formatTitle } from "@/lib/profile-format";
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
    setFetchMsg({ ok: true, text: "Description added from the link - check it reads right." });
  }
  const lastDetected = useRef("");
  const edited = useRef<Set<keyof Fields>>(new Set());

  // A job sent from the Jobcraft Chrome extension: it leaves the details in this tab's sessionStorage
  // (and fires "jobcraft-import" if the page is already open). Fill the form; the user still checks and adds it.
  const [imported, setImported] = useState<string | null>(null);
  useEffect(() => {
    const take = () => {
      const raw = sessionStorage.getItem("jobcraft-import");
      if (!raw) return;
      sessionStorage.removeItem("jobcraft-import");
      try {
        const j = JSON.parse(raw) as { jd?: string; url?: string; company?: string; role?: string; location?: string; site?: string };
        const text = String(j.jd ?? "").slice(0, 30000);
        if (text.trim().split(/\s+/).length < 10) return;
        setJd(text);
        if (j.url && /^https?:\/\//.test(j.url)) setUrl(j.url.slice(0, 500));
        const next: Partial<Fields> = {};
        const flags: Partial<Record<keyof Fields, boolean>> = {};
        (["company", "role", "location"] as const).forEach((k) => {
          const v = String(j[k] ?? "").trim().slice(0, 90);
          if (v) {
            next[k] = v;
            flags[k] = true;
          }
        });
        setF((x) => ({ ...x, ...next }));
        setAuto((x) => ({ ...x, ...flags }));
        setImported(String(j.site ?? "the job page").slice(0, 40));
      } catch {}
    };
    take();
    window.addEventListener("jobcraft-import", take);
    return () => window.removeEventListener("jobcraft-import", take);
  }, []);

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
        company: formatTitle(f.company, 80),
        role: formatTitle(f.role),
        location: formatCity(f.location) || null,
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
          <span>{label}{k !== "location" ? <span className="ml-1 text-clay">*</span> : null}</span>
          {auto[k] && <span className="chip bg-mustard-soft px-1.5 py-0 text-[0.78rem] text-mustard-ink"><Sparkles size={10} /> from JD</span>}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">{icon}</span>
          {detecting && !f[k] ? (
            <div className="skeleton h-[2.6rem] w-full rounded-[14px]" />
          ) : (
            <input className="field pl-9" maxLength={k === "role" ? 90 : 80} value={f[k]} onChange={(e) => set(k, e.target.value)} onBlur={() => { const v = k === "location" ? formatCity(f[k]) : formatTitle(f[k]); if (v !== f[k]) setF((x) => ({ ...x, [k]: v })); }} placeholder={placeholder} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header className="pt-2 fade-up">
        <h1 className="text-[2.6rem] font-bold leading-none">Add a job<span className="text-clay">.</span></h1>
        <p className="mt-2 text-[1rem] text-muted">Paste a link or the description.</p>
      </header>
      {imported && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-good-soft px-4 py-3 fade-up">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-good text-white"><DownloadCloud size={14} /></span>
          <span className="flex-1 text-[0.92rem] font-medium text-ink">Sent from {imported}. Check the details, then click <b>Analyse job</b>.</span>
        </div>
      )}

      <form onSubmit={submit} className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Paste pane */}
        <div className="card flex flex-col overflow-hidden fade-up">
          <div className="border-b border-line p-5" style={{ background: "var(--color-cream)" }}>
            <div className="mb-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-muted">1 · From a link</div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Link2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  className="field h-11 bg-card pl-9"
                  placeholder="Company careers page, Lever, Greenhouse..."
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
              <button type="button" id="jc-get-desc" className="btn btn-primary h-11" disabled={!url.trim() || fetching} onClick={fromLink}>
                {fetching ? <Spinner size={14} /> : <DownloadCloud size={15} />} Get description
              </button>
            </div>
            {fetchMsg && <p className={`mt-2 text-[0.84rem] ${fetchMsg.ok ? "text-good" : "text-mid"}`}>{fetchMsg.text}</p>}
          </div>
          <div className="flex items-center justify-between px-5 pt-4">
            <span className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-muted">2 · Or paste the description</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[0.76rem] font-semibold tabular-nums ${words >= 30 ? "bg-good-soft text-good" : "bg-line-2 text-muted"}`}>{words} words{words < 30 ? " · need 30+" : ""}</span>
          </div>
          <textarea
            autoFocus
            required
            className="thin-scroll block h-[min(60vh,600px)] w-full resize-none border-0 bg-transparent px-5 py-3 text-[0.97rem] leading-relaxed outline-none placeholder:text-faint"
            placeholder="Paste the full job description here (LinkedIn, Naukri, any site)..."
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
        </div>

        {/* Preview pane */}
        <aside className="flex flex-col gap-4 fade-up">
          <div className="dark-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-cream/80">Preview</span>
              {detecting && <span className="flex items-center gap-1.5 text-[0.8rem] text-cream/85"><Spinner size={13} /> Reading...</span>}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full avatar-warm font-display text-[1.2rem] font-bold">{(f.company.trim()[0] ?? "?").toUpperCase()}</span>
              <div className="min-w-0">
                <div className="truncate text-[0.9rem] text-cream/85">{f.company || "Company"}</div>
                <div className="line-clamp-2 font-display text-[1.25rem] font-bold leading-tight">{f.role || "Role"}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[0.76rem]">
              {f.location && <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5"><MapPin size={11} />{f.location}</span>}
              {f.company_type && <span className="rounded-full bg-white/10 px-2.5 py-0.5">{f.company_type}</span>}
              {url.trim() && <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5"><Link2 size={11} />Link added</span>}
            </div>
          </div>

          <div className="card flex-1 space-y-4 p-5">
            {detField("company", "Company", <Building2 size={15} />, words < 30 ? "Filled from the JD" : "Company name")}
            {detField("role", "Role", <UserRound size={15} />, words < 30 ? "Filled from the JD" : "Job title")}
            {detField("location", "Location", <MapPin size={15} />, "Optional")}
            {words >= 30 && !detecting && (!f.company || !f.role) && <p className="text-[0.85rem] text-mid">Add the company and role - they weren&apos;t in the text.</p>}
            {err && <p className="text-[0.85rem] text-bad">{err}</p>}
            <button className="btn btn-clay h-12 w-full text-[1rem]" disabled={busy || !ready}>
              {busy ? <Spinner /> : <Sparkles size={15} />} Analyse job <ArrowRight size={15} />
            </button>
            <ol className="grid grid-cols-4 gap-1 border-t border-line pt-4 text-center text-[0.78rem] text-muted">
              {["Decode", "Fit score", "Resume", "Outreach"].map((x, i) => (
                <li key={x}>
                  <span data-tone={i % 5} className="tone-chip mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full bg-line-2 font-display text-[0.78rem] font-bold text-ink">{i + 1}</span>
                  {x}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </form>
    </div>
  );
}
