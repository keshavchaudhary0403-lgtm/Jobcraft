"use client";

import { useEffect, useState } from "react";
import { Briefcase, Check, FileText, IndianRupee, MapPin, Plus, Sparkles, UserRound, X } from "lucide-react";
import type { ProfileDraft } from "@/lib/profile-draft";
export type { ProfileDraft } from "@/lib/profile-draft";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "./client-ui";
import { ResumePreview } from "./ResumePreview";
import { ResumeHealth } from "./ResumeHealth";
import { resumeHealth } from "@/lib/resume-health";
import { profileStrength } from "./ui";

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

function Section({ title, sub, children, className = "", n }: { title: string; sub?: string; children: React.ReactNode; className?: string; n?: string }) {
  return (
    <section className={`card flex flex-col p-6 ${className}`}>
      <div className="mb-4 flex items-start gap-3">
        {n && <span data-tone={(Number(n) - 1) % 5} className="tone-chip grid h-8 w-8 shrink-0 place-items-center rounded-full bg-clay-soft font-display text-[0.82rem] font-bold text-clay">{n}</span>}
        <div className="min-w-0">
          <h2 className="text-[1.25rem] font-bold leading-tight">{title}</h2>
          {sub && <div className="mt-0.5 text-[0.85rem] text-muted">{sub}</div>}
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

export function ProfileReview({ userId, initial, onSaved, cta = "Save changes", tabs, baseline, scoreStart, head }: { userId: string; initial: ProfileDraft; onSaved?: () => void; cta?: string; tabs?: boolean; baseline?: ProfileDraft; scoreStart?: number | null; head?: { loginId: string; actions: React.ReactNode } }) {
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
        ...(scoreStart == null && saved.master_resume?.trim() ? { resume_score_start: resumeHealth(saved.master_resume).score } : {}),
      })
      .eq("id", userId);
    setBusy(false);
    if (error) return setMsg(error.message);
    setSaved(d);
    setMsg("Saved");
    setTimeout(() => setMsg(""), 1500);
    onSaved?.();
  }


  const skillsBox = (
    <div className="flex flex-wrap gap-2">
      {d.skills.map((s, i) => (
        <span key={s} data-tone={i % 5} className="tone-soft chip border-[1.5px] border-line bg-card py-1 pl-3 text-[0.86rem] font-medium text-ink">
          {s}
          <button onClick={() => set("skills", d.skills.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="grid h-4 w-4 place-items-center rounded-full text-faint hover:bg-clay-soft hover:text-clay">
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
        <input className="h-[2rem] w-36 rounded-full border-[1.5px] border-dashed border-clay/50 bg-card px-3 text-[0.85rem] outline-none placeholder:text-clay/70 focus:border-clay" placeholder="+ Add skill" value={skill} onChange={(e) => setSkill(e.target.value)} />
        <button className="sr-only" aria-label="Add skill"><Plus size={12} /></button>
      </form>
    </div>
  );

  const basicsS = (
      <Section n="01" title="Basics" sub="Who you are and what you're going after.">
        <div className={`grid gap-4 sm:grid-cols-2 ${tabs ? "lg:grid-cols-3" : ""}`}>
          <Field label="Name" value={d.full_name ?? ""} onChange={(v) => set("full_name", v)} />
          <Field label="Current title" value={d.current_title ?? ""} onChange={(v) => set("current_title", v)} />
          <Field label="Experience" value={d.experience_years ?? ""} onChange={(v) => set("experience_years", v)} placeholder="4 years" />
          <Field label="Target role" value={d.target_role ?? ""} onChange={(v) => set("target_role", v)} placeholder="e.g. Product Manager in fintech" wide />
          <Field label="City" value={d.city ?? ""} onChange={(v) => set("city", v)} />
          {tabs && <Field label="Current CTC" value={d.current_ctc ?? ""} onChange={(v) => set("current_ctc", v)} placeholder="₹6.5 LPA - salary practice only" />}
          {tabs && <Field label="LinkedIn URL" value={d.linkedin_url ?? ""} onChange={(v) => set("linkedin_url", v)} placeholder="linkedin.com/in/..." wide />}
        </div>
      </Section>
  );
  const notesS = (
      <Section n="04" title="Not on your resume" sub="Anything true the AI should know - side projects, results, context.">
        <textarea className="field h-full min-h-[140px]" rows={5} value={d.extra_notes ?? ""} onChange={(e) => set("extra_notes", e.target.value)} />
      </Section>
  );
  const bestS = (
      <Section n="02" title="Best results" sub="1-2 wins with real numbers. Used in outreach and salary talks.">
        <textarea className="field h-full min-h-[120px]" rows={4} value={d.strongest_proof ?? ""} onChange={(e) => set("strongest_proof", e.target.value)} />
      </Section>
  );
  const skillsS = (
      <Section n="03" title="Skills" sub={`${d.skills.length} skill${d.skills.length === 1 ? "" : "s"} - recruiters search these.`}>
        {skillsBox}
      </Section>
  );
  const optionalS = (
      <Section n="04" title="Optional" sub="Only used where it helps.">
        <div className="grid gap-4">
          <Field label="Current CTC" value={d.current_ctc ?? ""} onChange={(v) => set("current_ctc", v)} placeholder="₹6.5 LPA - only for salary practice" />
          <Field label="LinkedIn URL" value={d.linkedin_url ?? ""} onChange={(v) => set("linkedin_url", v)} placeholder="linkedin.com/in/..." />
          <Field label="Anything true that's not on your resume" value={d.extra_notes ?? ""} onChange={(v) => set("extra_notes", v)} area />
        </div>
      </Section>
  );
  const detailsUI = (
    <>
      {basicsS}
      {bestS}
      {skillsS}
      {optionalS}
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
  const resumeUI = tabs ? (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <ResumePreview page value={d.master_resume ?? ""} onChange={(v) => set("master_resume", v)} />
      <div className="thin-scroll lg:sticky lg:top-[6.4rem] lg:max-h-[calc(100vh-7.4rem)] lg:overflow-y-auto lg:rounded-[22px]">
        <ResumeHealth compact value={d.master_resume ?? ""} savedValue={saved.master_resume ?? ""} start={scoreStart ?? null} onChange={(v) => set("master_resume", v)} />
      </div>
    </div>
  ) : (
    <ResumePreview value={d.master_resume ?? ""} onChange={(v) => set("master_resume", v)} />
  );

  if (tabs) {
    const strength = profileStrength(d);
    const health = (d.master_resume ?? "").trim() ? resumeHealth(d.master_resume ?? "").score : null;
    const initials = (d.full_name || "You").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    const filled = [d.full_name, d.current_title, d.target_role, d.experience_years, d.city, d.strongest_proof, d.linkedin_url].filter((x) => (x ?? "").trim()).length;
    const facts = [
      { icon: <Briefcase size={14} />, label: "Experience", v: d.experience_years },
      { icon: <MapPin size={14} />, label: "City", v: d.city },
      { icon: <Sparkles size={14} />, label: "Skills", v: d.skills.length ? `${d.skills.length} listed` : "" },
      { icon: <IndianRupee size={14} />, label: "Current CTC", v: d.current_ctc },
    ];
    const chapters = [
      { k: "details" as const, label: "Details", sub: `${filled} of 7 filled`, icon: UserRound },
      { k: "resume" as const, label: "Resume", sub: health != null ? `Health ${health}/100` : "Not added yet", icon: FileText },
    ];
    return (
      <div className="space-y-5">
        {head && (
          <header className="flex flex-wrap items-end justify-between gap-4 pt-2 fade-up">
            <div>
              <h1 className="text-[2.6rem] font-bold leading-none">Profile<span className="text-clay">.</span></h1>
              <p className="mt-2 text-[1rem] text-muted">Signed in as {head.loginId}</p>
            </div>
            <div className="flex flex-wrap gap-2">{head.actions}</div>
          </header>
        )}

        {/* Hero */}
        <section className="card grid gap-6 p-7 fade-up lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 flex-wrap items-center gap-5">
            <span className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-full bg-mustard font-display text-[1.9rem] font-bold text-side">{initials}</span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[2.1rem] font-bold leading-[1.05]">{d.full_name || "Your name"}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.98rem] text-muted">
                <span>{d.current_title || "Current title"}</span>
                <span className="text-clay">→</span>
                <span className="font-semibold text-ink">{d.target_role || "Target role"}</span>
              </div>
              <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-2">
                {facts.map((f) => (
                  <div key={f.label}>
                    <dt className="flex items-center gap-1.5 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-faint">{f.icon}{f.label}</dt>
                    <dd className={`font-medium ${f.v ? "" : "text-faint"}`}>{f.v || "-"}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Ring value={strength} label="Profile" color="var(--color-clay)" />
            <Ring value={health ?? 0} label="Resume" color={health == null ? "var(--line)" : health >= 80 ? "var(--color-good)" : health >= 60 ? "var(--color-mustard)" : "var(--color-clay)"} text={health == null ? "-" : undefined} />
          </div>
        </section>

        {/* Chapters + save */}
        <div className="sticky top-[68px] lg:top-3 z-20 -mx-1 grid gap-3 bg-bg/90 px-1 py-2 backdrop-blur md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          {chapters.map((c, i) => {
            const on = view === c.k;
            return (
              <button key={c.k} onClick={() => setView(c.k)} className={`flex items-center gap-3 rounded-[20px] border-[1.5px] px-4 py-3 text-left transition ${on ? "border-side bg-side text-cream" : "border-line bg-card hover:border-brand/40"}`}>
                <span data-tone={on ? undefined : i % 5} className={`tone-chip grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[0.9rem] font-bold ${on ? "bg-cream text-side" : "bg-line-2 text-muted"}`}>{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-display text-[1.1rem] font-bold leading-tight"><c.icon size={15} /> {c.label}</span>
                  <span className={`block truncate text-[0.8rem] ${on ? "text-cream/65" : "text-muted"}`}>{c.sub}</span>
                </span>
              </button>
            );
          })}
          <div className={`flex items-center justify-end gap-2 rounded-[20px] border-[1.5px] px-3 py-2 ${dirty ? "border-clay/40 bg-clay-soft" : "border-line bg-card"}`}>
            <span className={`flex items-center gap-1.5 px-1 text-[0.86rem] ${msg && msg !== "Saved" ? "text-bad" : msg ? "text-good" : dirty ? "font-semibold text-clay" : "text-muted"}`}>
              {!dirty && !msg && <Check size={14} />}{msg || (dirty ? "Unsaved changes" : "All saved")}
            </span>
            {dirty && <button className="btn btn-ghost btn-sm bg-card" onClick={() => setD(saved)} disabled={busy}>Discard</button>}
            <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !dirty || !(d.master_resume ?? "").trim()}>
              {busy ? <Spinner size={13} /> : null} {cta}
            </button>
          </div>
        </div>

        {view === "details" ? (
          <div className="grid items-start gap-5 xl:grid-cols-3">
            <div className="flex flex-col gap-5 self-stretch xl:col-span-2">{basicsS}{skillsS}</div>
            <div className="flex flex-col gap-5 self-stretch [&>section]:flex-1">{bestS}{notesS}</div>
          </div>
        ) : resumeUI}
      </div>
    );
  }

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

function Ring({ value, label, color, text }: { value: number; label: string; color: string; text?: string }) {
  const size = 104, stroke = 10, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-2)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset .8s ease" }} />
        </svg>
        <span className="absolute font-display text-[1.6rem] font-bold tabular-nums">{text ?? value}</span>
      </div>
      <span className="mt-1.5 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
    </div>
  );
}
