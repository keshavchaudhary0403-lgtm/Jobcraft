"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { ProfileDraft } from "@/lib/profile-draft";
export type { ProfileDraft } from "@/lib/profile-draft";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "./client-ui";

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
        <div className="font-semibold">{title}</div>
        {sub && <div className="text-[0.85rem] text-muted">{sub}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function ProfileReview({ userId, initial, onSaved, cta = "Save changes" }: { userId: string; initial: ProfileDraft; onSaved?: () => void; cta?: string }) {
  const [d, setD] = useState(initial);
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
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4 stagger">
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
            <Field label="LinkedIn URL" value={d.linkedin_url ?? ""} onChange={(v) => set("linkedin_url", v)} placeholder="linkedin.com/in/…" />
            <Field label="Anything true that's not on your resume" value={d.extra_notes ?? ""} onChange={(v) => set("extra_notes", v)} wide area />
          </div>
        </Section>

        <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-2xl border border-line bg-white/90 p-3 shadow-lg backdrop-blur">
          <button className="btn btn-brand" onClick={save} disabled={busy || !(d.master_resume ?? "").trim()}>
            {busy && <Spinner />} {cta}
          </button>
          <span className="text-[0.88rem] text-muted">{msg}</span>
        </div>
      </div>

      <section className="card flex flex-col xl:sticky xl:top-6 xl:h-[calc(100vh-3.5rem)] fade-up">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <span className="font-semibold">Resume text</span>
          <span className="text-[0.82rem] text-faint">{words} words</span>
        </div>
        <textarea
          className="thin-scroll min-h-[420px] flex-1 resize-none border-0 bg-transparent px-5 py-4 font-mono text-[0.8rem] leading-relaxed outline-none xl:min-h-0"
          value={d.master_resume ?? ""}
          onChange={(e) => set("master_resume", e.target.value)}
        />
      </section>
    </div>
  );
}
