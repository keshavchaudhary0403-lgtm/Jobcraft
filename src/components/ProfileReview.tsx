"use client";

import { useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "./client-ui";

export type ProfileDraft = Pick<
  Profile,
  "full_name" | "current_title" | "target_role" | "experience_years" | "city" | "strongest_proof" | "master_resume" | "linkedin_url" | "current_ctc" | "extra_notes"
> & { skills: string[] };

export function draftFrom(p: Partial<Profile>): ProfileDraft {
  return {
    full_name: p.full_name ?? "",
    current_title: p.current_title ?? "",
    target_role: p.target_role ?? "",
    experience_years: p.experience_years ?? "",
    city: p.city ?? "",
    strongest_proof: p.strongest_proof ?? "",
    master_resume: p.master_resume ?? "",
    linkedin_url: p.linkedin_url ?? "",
    current_ctc: p.current_ctc ?? "",
    extra_notes: p.extra_notes ?? "",
    skills: p.skills ?? [],
  };
}

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

export function ProfileReview({
  userId,
  initial,
  onSaved,
  cta = "Save",
}: {
  userId: string;
  initial: ProfileDraft;
  onSaved?: () => void;
  cta?: string;
}) {
  const [d, setD] = useState(initial);
  const [more, setMore] = useState(false);
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
    setMsg("Saved");
    setTimeout(() => setMsg(""), 1500);
    onSaved?.();
  }

  const words = (d.master_resume ?? "").split(/\s+/).filter(Boolean).length;

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-5 stagger">
        <section className="card p-6 lg:p-7">
          <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
            <Field label="Name" value={d.full_name ?? ""} onChange={(v) => set("full_name", v)} />
            <Field label="Current title" value={d.current_title ?? ""} onChange={(v) => set("current_title", v)} />
            <Field label="Target role" value={d.target_role ?? ""} onChange={(v) => set("target_role", v)} placeholder="e.g. Product Manager in fintech" wide />
            <Field label="Experience" value={d.experience_years ?? ""} onChange={(v) => set("experience_years", v)} placeholder="4 years" />
            <Field label="City" value={d.city ?? ""} onChange={(v) => set("city", v)} />
            <Field label="Best results (with numbers)" value={d.strongest_proof ?? ""} onChange={(v) => set("strongest_proof", v)} wide area />
          </div>
        </section>

        <section className="card p-6 lg:p-7">
          <label className="label">Skills</label>
          <div className="flex flex-wrap gap-2">
            {d.skills.map((s) => (
              <span key={s} className="chip bg-slate-100 py-1 text-slate-700">
                {s}
                <button onClick={() => set("skills", d.skills.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="text-faint hover:text-ink">
                  <X size={12} />
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
              <input className="w-36 rounded-full border border-dashed border-line bg-white px-3 py-1 text-xs outline-none focus:border-brand" placeholder="+ Add skill" value={skill} onChange={(e) => setSkill(e.target.value)} />
              <button className="sr-only" aria-label="Add skill"><Plus size={12} /></button>
            </form>
          </div>

          <button className="mt-6 flex items-center gap-1 text-sm text-muted hover:text-ink" onClick={() => setMore(!more)}>
            <ChevronDown size={16} className={`transition ${more ? "rotate-180" : ""}`} /> More details (optional)
          </button>
          {more && (
            <div className="mt-4 grid gap-x-5 gap-y-4 md:grid-cols-2 fade-up">
              <Field label="Current CTC" value={d.current_ctc ?? ""} onChange={(v) => set("current_ctc", v)} placeholder="₹6.5 LPA — only for salary practice" />
              <Field label="LinkedIn URL" value={d.linkedin_url ?? ""} onChange={(v) => set("linkedin_url", v)} />
              <Field label="Anything true that's not on your resume" value={d.extra_notes ?? ""} onChange={(v) => set("extra_notes", v)} wide area />
            </div>
          )}
        </section>

        <div className="flex items-center gap-3">
          <button className="btn btn-brand px-6 py-3" onClick={save} disabled={busy || !(d.master_resume ?? "").trim()}>
            {busy && <Spinner />} {cta}
          </button>
          {msg && <span className="text-sm text-muted fade-up">{msg}</span>}
        </div>
      </div>

      <section className="card flex flex-col p-5 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] fade-up">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-medium">Resume text</span>
          <span className="text-xs text-muted">{words} words</span>
        </div>
        <textarea
          className="field min-h-[420px] flex-1 resize-none font-mono text-[0.72rem] leading-relaxed xl:min-h-[200px]"
          value={d.master_resume ?? ""}
          onChange={(e) => set("master_resume", e.target.value)}
        />
      </section>
    </div>
  );
}
