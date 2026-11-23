"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, UserRound, X } from "lucide-react";
import type { ProfileDraft } from "@/lib/profile-draft";
export type { ProfileDraft } from "@/lib/profile-draft";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "./client-ui";
import { ResumePreview } from "./ResumePreview";

function Field({ label, value, onChange, placeholder, wide, area }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; wide?: boolean; area?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="label">{label}</label>
      {area ? (
        <textarea className="field" rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="field" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className="border-b border-line px-5 py-3.5">
        <div className="font-bold">{title}</div>
        {sub && <div className="text-[0.85rem] text-muted">{sub}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function ProfileReview({ userId, initial, onSaved, cta = "Save changes", tabs, baseline }: { userId: string; initial: ProfileDraft; onSaved?: () => void; cta?: string; tabs?: boolean; baseline?: ProfileDraft }) {
  const [d, setD] = useState(initial);
  const [view, setView] = useState<"details" | "resume">("details");
  const [saved, setSaved] = useState(baseline ?? initial);
  const dirty = JSON.stringify(d) !== JSON.stringify(saved);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const [skill, setSkill] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = <K extends keyof ProfileDraft>(k: K, v: ProfileDraft[K]) => setD((x) => ({ ...x, [k]: v }));

  async function save() {
    setBusy(true);
    setMsg("");
    const blank = (v: string | null) => (v && v.trim() ? v.trim() : null);
    const { error } = await createClient()
      .from("profiles")
      .update({
        full_name: blank(d.full_name),
        current_title: blank(d.current_title),
        target_role: blank(d.target_role),
        experience_years: blank(d.experience_years),
        city: blank(d.city),
        strongest_proof: blank(d.strongest_proof),
        master_resume: blank(d.master_resume),
        linkedin_url: blank(d.linkedin_url),
        current_ctc: blank(d.current_ctc),
        extra_notes: blank(d.extra_notes),
        skills: d.skills,
        onboarded: true,
      })
      .eq("id", userId);
    setBusy(false);
    if (error) return setMsg(error.message);
    setSaved(d);
    setMsg("Saved");
    setTimeout(() => setMsg(""), 1500);
    onSaved?.();
  }


  const detailsUI = (
    <>
      <div className="space-y-4">
        <Section title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" value={d.full_name ?? ""} onChange={(v) => set("full_name", v)} />
            <Field label="Current title" value={d.current_title ?? ""} onChange={(v) => set("current_title", v)} />
            <Field label="Target role" value={d.target_role ?? ""} onChange={(v) => set("target_role", v)} placeholder="e.g. Product Manager in fintech" wide />
            <Field label="Experience" value={d.experience_years ?? ""} onChange={(v) => set("experience_years", v)} placeholder="4 years" />
            <Field label="City" value={d.city ?? ""} onChange={(v) => set("city", v)} />
          </div>
        </Section>

        <Section title="Best results" sub="Your 1–2 strongest wins, with real numbers. Used in outreach and salary talks.">
          <textarea className="field" rows={3} value={d.strongest_proof ?? ""} onChange={(e) => set("strongest_proof", e.target.value)} />
        </Section>

      </div>
      <div className="space-y-4">
        <Section title="Skills">
          <div className="flex flex-wrap gap-2">
            {d.skills.map((s) => (
              <span key={s} className="chip border border-line bg-white py-1 pl-3 text-slate-700">
                {s}
                <button onClick={() => set("skills", d.skills.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="grid h-4 w-4 place-items-center rounded-full text-faint hover:bg-slate-100 hover:text-ink">
                  <X size={11} />
                </button>
              </span>
            ))}
            <form
              className="flex"
              onSubmit={(e) => {
                e.preventDefault();
                const v = skill.trim();
                if (v && !d.skills.includes(v)) set("skills", [...d.skills, v]);
                setSkill("");
              }}
            >
              <input className="h-[1.95rem] w-36 rounded-full border border-dashed border-line bg-white px-3 text-[0.85rem] outline-none focus:border-brand" placeholder="+ Add skill" value={skill} onChange={(e) => setSkill(e.target.value)} />
              <button className="sr-only" aria-label="Add skill"><Plus size={12} /></button>
            </form>
          </div>
        </Section>

        <Section title="Optional">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Current CTC" value={d.current_ctc ?? ""} onChange={(v) => set("current_ctc", v)} placeholder="₹6.5 LPA — only for salary practice" />
            <Field label="LinkedIn URL" value={d.linkedin_url ?? ""} onChange={(v) => set("linkedin_url", v)} placeholder="linkedin.com/in/…" wide />
            <Field label="Anything true that's not on your resume" value={d.extra_notes ?? ""} onChange={(v) => set("extra_notes", v)} wide area />
          </div>
        </Section>

      </div>
    </>
  );
  const saveBar = (
        <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-2xl border border-line bg-white/90 p-3 shadow-lg backdrop-blur">
          <button className="btn btn-brand" onClick={save} disabled={busy || !(d.master_resume ?? "").trim()}>
            {busy && <Spinner />} {cta}
          </button>
          <span className="text-[0.88rem] text-muted">{msg || (dirty ? "Unsaved changes" : "")}</span>
        </div>
  );
  const resumeUI = <ResumePreview page={tabs} value={d.master_resume ?? ""} onChange={(v) => set("master_resume", v)} />;

  if (tabs)
    return (
      <div className="space-y-4">
        <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center justify-between gap-3 bg-bg/90 px-1 py-2 backdrop-blur">
        <div className="inline-flex gap-1 rounded-xl bg-line-2 p-1">
          {([["details", "Details", UserRound], ["resume", "Resume", FileText]] as const).map(([k, l, Icon]) => (
            <button key={k} onClick={() => setView(k)} className={`flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-[0.9rem] font-semibold transition ${view === k ? "bg-white text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink"}`}>
              <Icon size={14} /> {l}
            </button>
          ))}
        </div>
          <div className="flex items-center gap-2">
            <span className={`text-[0.86rem] ${msg && msg !== "Saved" ? "text-bad" : msg ? "text-good" : "text-muted"}`}>{msg || (dirty ? "Unsaved changes" : "All changes saved")}</span>
            {dirty && <button className="btn btn-ghost btn-sm" onClick={() => setD(saved)} disabled={busy}>Discard</button>}
            <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !dirty || !(d.master_resume ?? "").trim()}>
              {busy ? <Spinner size={13} /> : null} {cta}
            </button>
          </div>
        </div>
        {view === "details" ? <div className="grid items-start gap-4 xl:grid-cols-2 stagger">{detailsUI}</div> : resumeUI}
      </div>
    );

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4 stagger">
        {detailsUI}
        {saveBar}
      </div>
      {resumeUI}
    </div>
  );
}
