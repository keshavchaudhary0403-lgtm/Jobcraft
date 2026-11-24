"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, ExternalLink, FileText, NotebookPen, Plus, Tags, Trophy, UserRound, X } from "lucide-react";
import { keepUploadedResume, uploadedResumeInfo } from "@/lib/actions";
import { CtcField, ExperienceField, LinkedInField, TextField } from "./BasicFields";
import { normaliseBasics } from "@/lib/profile-format";
import type { ProfileDraft } from "@/lib/profile-draft";
export type { ProfileDraft } from "@/lib/profile-draft";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "./client-ui";
import { ResumePreview } from "./ResumePreview";
import { ResumeHealth } from "./ResumeHealth";
import { resumeHealth } from "@/lib/resume-health";
import { profileStrength, Meter } from "./ui";

function Section({ title, sub, children, className = "", icon: Icon, tone, meta }: { title: string; sub?: string; children: React.ReactNode; className?: string; icon: React.ElementType; tone: number; meta?: React.ReactNode }) {
  return (
    <section className={`card flex flex-col p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-start gap-3">
        <span data-tone={tone} className="tone-chip grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-line-2"><Icon size={16} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[1.15rem] font-bold leading-tight">{title}</h2>
          {sub && <div className="mt-0.5 text-[0.85rem] text-muted">{sub}</div>}
        </div>
        {meta && <div className="shrink-0 text-[0.8rem] font-semibold text-muted">{meta}</div>}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}

function Notes({ value, onChange, placeholder, max, hint }: { value: string; onChange: (v: string) => void; placeholder: string; max: number; hint: string }) {
  return (
    <>
      <textarea className="field min-h-[150px] flex-1 resize-none" maxLength={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      <div className="mt-1.5 flex justify-between gap-3 text-[0.78rem] text-muted"><span>{hint}</span><span className="tabular-nums">{value.length}/{max}</span></div>
    </>
  );
}

/** Which PDF the profile came from: name, upload date and a View button - or the one waiting to be saved. */
function UploadedFile({ file, pending }: { file: { name: string; uploadedAt: string } | null; pending?: string | null }) {
  if (!file && !pending) return null;
  const when = file?.uploadedAt ? new Date(file.uploadedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  return (
    <div className="card flex flex-wrap items-center gap-3 px-4 py-3">
      <span data-tone="3" className="tone-chip grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-line-2"><FileText size={16} /></span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.92rem] font-semibold" data-tip={pending ?? file?.name}>{pending ?? file?.name}</div>
        <div className="text-[0.8rem] text-muted">{pending ? "Just uploaded - saved as your resume file when you save" : `Your uploaded resume · ${when}`}</div>
      </div>
      {!pending && file && (
        <a href="/api/resume/file" target="_blank" rel="noreferrer" className="pill-nav shrink-0"><ExternalLink size={13} /> View PDF</a>
      )}
    </div>
  );
}

export function ProfileReview({ userId, initial, onSaved, cta = "Save changes", tabs, baseline, scoreStart, head, pendingFile, onFileKept }: { userId: string; initial: ProfileDraft; onSaved?: () => void; cta?: string; tabs?: boolean; baseline?: ProfileDraft; scoreStart?: number | null; head?: { loginId: string; actions: React.ReactNode }; pendingFile?: string | null; onFileKept?: () => void }) {
  const [file, setFile] = useState<{ name: string; uploadedAt: string } | null>(null);
  useEffect(() => {
    uploadedResumeInfo().then(setFile).catch(() => {});
  }, []);
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

  const { value: clean, errors } = normaliseBasics(d);
  const required = [d.full_name, d.current_title, d.target_role, d.experience_years, d.city];
  const missing = required.filter((x) => !(x ?? "").trim()).length;
  const blocked = Object.keys(errors).length > 0;

  async function save() {
    if (blocked) return setMsg("Fix the fields marked in red");
    const d = clean;
    setD(clean);
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
    if (pendingFile) {
      // the PDF they uploaded now becomes their resume file
      await keepUploadedResume().catch(() => null);
      setFile(await uploadedResumeInfo().catch(() => null));
      onFileKept?.();
    }
    setSaved(clean);
    setMsg("Saved");
    setTimeout(() => setMsg(""), 1500);
    onSaved?.();
  }


  const skillsBox = (
    <div className="flex flex-wrap gap-2">
      {d.skills.map((s, i) => (
        <span key={s} data-tone={i % 5} className="tone-soft chip bg-line-2 py-1 pl-3 text-[0.86rem] font-medium text-ink">
          {s}
          <button onClick={() => set("skills", d.skills.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="grid h-4 w-4 place-items-center rounded-full text-muted hover:bg-bad-soft hover:text-bad">
            <X size={11} />
          </button>
        </span>
      ))}
      <form
        className="flex"
        onSubmit={(e) => {
          e.preventDefault();
          const v = skill.replace(/\s+/g, " ").trim().slice(0, 40);
          if (v && !d.skills.some((x) => x.toLowerCase() === v.toLowerCase()) && d.skills.length < 25) set("skills", [...d.skills, v]);
          setSkill("");
        }}
      >
        <label className="flex h-[2rem] items-center gap-1 rounded-full border-[1.5px] border-dashed border-brand/40 bg-card pl-2.5 pr-1 text-brand focus-within:border-brand">
          <Plus size={13} />
          <input className="w-28 bg-transparent text-[0.85rem] font-medium text-ink outline-none placeholder:text-brand/80" maxLength={40} placeholder="Add skill" value={skill} onChange={(e) => setSkill(e.target.value)} />
          {skill.trim() && <button className="rounded-full bg-brand px-2 py-0.5 text-[0.72rem] font-semibold text-white">Add</button>}
        </label>
      </form>
    </div>
  );

  const basicsS = (
      <Section icon={UserRound} tone={0} title="Basics" sub="Who you are and what you're going after." meta={missing ? <span className="text-clay">{missing} required left</span> : <span className="flex items-center gap-1 text-good"><Check size={13} /> Complete</span>}>
        <div className={`grid gap-x-4 gap-y-3.5 sm:grid-cols-2 ${tabs ? "lg:grid-cols-3" : ""}`}>
          <TextField kind="name" label="Full name" required value={d.full_name ?? ""} onChange={(v) => set("full_name", v)} placeholder="e.g. Priya Sharma" />
          <TextField kind="title" label="Current title" required value={d.current_title ?? ""} onChange={(v) => set("current_title", v)} placeholder="e.g. Marketing Manager" />
          <ExperienceField label="Experience" required value={d.experience_years ?? ""} onChange={(v) => set("experience_years", v)} hint="Full-time work only" />
          <TextField kind="title" maxLength={120} label="Target role" required value={d.target_role ?? ""} onChange={(v) => set("target_role", v)} placeholder="e.g. Product Manager in fintech" hint="The role + the industry you want next" className={tabs ? "sm:col-span-2" : "sm:col-span-2"} />
          <TextField kind="city" label="City" required value={d.city ?? ""} onChange={(v) => set("city", v)} placeholder="e.g. Bengaluru" />
          <CtcField label="Current CTC" optional value={d.current_ctc ?? ""} onChange={(v) => set("current_ctc", v)} hint="Yearly, in lakh. Only used for salary practice" />
          <LinkedInField label="LinkedIn" optional value={d.linkedin_url ?? ""} onChange={(v) => set("linkedin_url", v)} hint="Paste the full link or just your name part" className={tabs ? "sm:col-span-2" : ""} />
        </div>
      </Section>
  );
  const notesS = (
      <Section icon={NotebookPen} tone={4} title="Not on your resume" sub="True things the AI can use: side projects, context, gaps.">
        <Notes value={d.extra_notes ?? ""} onChange={(v) => set("extra_notes", v)} max={1200} placeholder="e.g. Ran a weekend food stall for 2 years. Took a 6-month career break in 2022 to care for family." hint="Only facts you'd say in an interview" />
      </Section>
  );
  const bestS = (
      <Section icon={Trophy} tone={2} title="Best results" sub="1-2 wins with real numbers.">
        <Notes value={d.strongest_proof ?? ""} onChange={(v) => set("strongest_proof", v)} max={500} placeholder="e.g. Grew monthly revenue from ₹8.5L to ₹25L in 3 months. Cut delivery time from 5 days to 2." hint="Number + what you did + the result" />
      </Section>
  );
  const skillsS = (
      <Section icon={Tags} tone={3} title="Skills" sub="Recruiters search and filter by these." meta={<span className={d.skills.length < 5 ? "text-clay" : ""}>{d.skills.length}/25</span>}>
        {skillsBox}
        <p className="mt-3 text-[0.78rem] text-muted">Aim for 8-15. Use the names recruiters type, e.g. &ldquo;SQL&rdquo;, &ldquo;P&amp;L management&rdquo;.</p>
      </Section>
  );
  const optionalS = (
      <Section icon={NotebookPen} tone={4} title="Not on your resume" sub="Optional. True things the AI can use.">
        <Notes value={d.extra_notes ?? ""} onChange={(v) => set("extra_notes", v)} max={1200} placeholder="e.g. Side projects, a career break, context behind a number." hint="Only facts you'd say in an interview" />
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
          <span className={`text-[0.88rem] ${blocked ? "flex items-center gap-1 text-bad" : "text-muted"}`}>{blocked && <AlertCircle size={14} />}{blocked ? "Fix the fields marked in red" : msg || (dirty ? "Unsaved changes" : "")}</span>
        </div>
  );
  const resumeUI = tabs ? (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4">
        <UploadedFile file={file} pending={pendingFile} />
        <ResumePreview page value={d.master_resume ?? ""} onChange={(v) => set("master_resume", v)} />
      </div>
      <div className="thin-scroll lg:sticky lg:top-[6.4rem] lg:max-h-[calc(100vh-7.4rem)] lg:overflow-y-auto lg:rounded-[22px]">
        <ResumeHealth compact value={d.master_resume ?? ""} savedValue={saved.master_resume ?? ""} start={scoreStart ?? null} onChange={(v) => set("master_resume", v)} />
      </div>
    </div>
  ) : (
    <div className="space-y-4">
      <UploadedFile file={file} pending={pendingFile} />
      <ResumePreview value={d.master_resume ?? ""} onChange={(v) => set("master_resume", v)} />
    </div>
  );

  if (tabs) {
    const strength = profileStrength(d);
    const health = (d.master_resume ?? "").trim() ? resumeHealth(d.master_resume ?? "").score : null;
    const initials = (d.full_name || "You").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    const filled = [d.full_name, d.current_title, d.target_role, d.experience_years, d.city, d.strongest_proof, d.linkedin_url].filter((x) => (x ?? "").trim()).length;
    const chapters = [
      { k: "details" as const, label: "Details", sub: missing ? `${missing} required left` : `${filled} of 7 filled`, icon: UserRound },
      { k: "resume" as const, label: "Resume", sub: health != null ? "Your master resume" : "Not added yet", icon: FileText },
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

        {/* Blue banner like Home and Admin: who you are, and two tinted scores. Details live in the form below. */}
        <section className="dark-card hero-band flex flex-wrap items-center gap-5 p-6 text-white fade-up sm:p-7">
          <span className="avatar-warm grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full font-display text-[1.6rem] font-bold ring-4 ring-white/20">{initials}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[1.9rem] font-bold leading-[1.05]">{d.full_name || "Your name"}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.95rem] text-white/85">
              <span>{d.current_title || "Current title"}</span>
              <span className="text-[var(--hero-accent)]">→</span>
              <span className="font-semibold text-white">{d.target_role || "Target role"}</span>
            </div>
          </div>
          <dl className="grid w-full grid-cols-2 gap-2.5 sm:w-auto">
            {[
              { label: "Profile", value: strength, show: `${strength}%`, color: "var(--hero-accent)", tone: 1 },
              { label: "Resume", value: health ?? 0, show: health == null ? "-" : `${health}/100`, color: health == null ? "rgba(255,255,255,.2)" : health >= 80 ? "#5fd99a" : health >= 60 ? "var(--s3)" : "var(--hero-accent)", tone: 0 },
            ].map((m) => (
              <div key={m.label} data-tone={m.tone} className="stat-tile w-full rounded-2xl px-4 pb-3 pt-3.5 sm:w-36">
                <dt className="truncate text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-white/85">{m.label}</dt>
                <dd className="mt-0.5 font-display text-[1.25rem] font-bold tabular-nums">{m.show}</dd>
                <Meter value={m.value / 100} color={m.color} track="rgba(255,255,255,.18)" height={5} className="mt-1.5" />
              </div>
            ))}
          </dl>
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
                  <span className={`block truncate text-[0.8rem] ${on ? "text-cream/85" : "text-muted"}`}>{c.sub}</span>
                </span>
              </button>
            );
          })}
          <div className={`flex items-center justify-end gap-2 rounded-[20px] border-[1.5px] px-3 py-2 ${dirty ? "border-clay/40 bg-clay-soft" : "border-line bg-card"}`}>
            <span className={`flex items-center gap-1.5 px-1 text-[0.86rem] ${blocked || (msg && msg !== "Saved") ? "text-bad" : msg ? "text-good" : dirty ? "font-semibold text-clay" : "text-muted"}`}>
              {!dirty && !msg && <Check size={14} />}{blocked ? "Fix the red fields" : msg || (dirty ? "Unsaved changes" : "All saved")}
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

