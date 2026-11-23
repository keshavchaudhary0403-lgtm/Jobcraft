"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

const FIELDS: { key: keyof Profile; label: string; hint?: string; rows?: number; placeholder?: string }[] = [
  { key: "full_name", label: "Full name" },
  { key: "target_role", label: "Target role & industry", placeholder: "e.g. Digital Marketing Manager in e-commerce or D2C" },
  { key: "experience_years", label: "Experience", placeholder: "e.g. about 4 years" },
  { key: "city", label: "City", placeholder: "e.g. Indore" },
  { key: "current_ctc", label: "Current CTC", placeholder: "e.g. ₹6.5 LPA" },
  { key: "linkedin_url", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/…" },
  {
    key: "strongest_proof",
    label: "Your strongest proof",
    hint: "1–2 best real results with numbers. Used in outreach and negotiation.",
    rows: 3,
    placeholder: "e.g. Managed a ₹4 lakh/month ad budget; festival campaign did ₹18 lakh at ~4x ROAS.",
  },
  {
    key: "extra_notes",
    label: "Other true facts (optional)",
    hint: "Things not on your resume but true: tools you know, side projects, numbers you remember, career gap reasons.",
    rows: 3,
  },
];

export function ProfileForm({ profile, loginId }: { profile: Profile; loginId: string }) {
  const [form, setForm] = useState<Profile>(profile);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [importing, setImporting] = useState(false);

  const set = (k: keyof Profile, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    setMsg("");
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        target_role: form.target_role,
        experience_years: form.experience_years,
        city: form.city,
        current_ctc: form.current_ctc,
        linkedin_url: form.linkedin_url,
        strongest_proof: form.strongest_proof,
        extra_notes: form.extra_notes,
        master_resume: form.master_resume,
      })
      .eq("id", profile.id);
    setSaving(false);
    setMsg(error ? `Could not save: ${error.message}` : "Saved ✓");
  }

  async function importPdf(file: File) {
    setImporting(true);
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/resume/extract", { method: "POST", body: fd });
    const data = await res.json();
    setImporting(false);
    if (data.text) {
      set("master_resume", data.text);
      setMsg("Resume imported — check it, then Save.");
    } else setMsg(data.error ?? "Import failed.");
  }

  return (
    <div className="space-y-8">
      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 font-medium">About you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key} className={f.rows ? "sm:col-span-2" : ""}>
              <label className="label">{f.label}</label>
              {f.rows ? (
                <textarea className="field" rows={f.rows} placeholder={f.placeholder} value={(form[f.key] as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} />
              ) : (
                <input className="field" placeholder={f.placeholder} value={(form[f.key] as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} />
              )}
              {f.hint && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">Master resume</h2>
            <p className="text-xs text-muted">Your full, current resume as text. Each job gets its own tailored copy from this.</p>
          </div>
          <label className="btn btn-ghost cursor-pointer text-sm">
            {importing ? "Reading PDF…" : "Import from PDF"}
            <input type="file" accept="application/pdf" className="hidden" disabled={importing} onChange={(e) => e.target.files?.[0] && importPdf(e.target.files[0])} />
          </label>
        </div>
        <textarea
          className="field font-mono text-xs leading-relaxed"
          rows={22}
          placeholder="Paste your resume here…"
          value={form.master_resume ?? ""}
          onChange={(e) => set("master_resume", e.target.value)}
        />
        <p className="mt-1 text-xs text-muted">{(form.master_resume ?? "").split(/\s+/).filter(Boolean).length} words</p>
      </section>

      <div className="sticky bottom-4 flex items-center gap-3">
        <button className="btn btn-primary shadow-sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save details"}
        </button>
        {msg && <span className="rounded-lg bg-white/90 px-2 py-1 text-sm text-muted">{msg}</span>}
      </div>

      <PasswordCard loginId={loginId} />
    </div>
  );
}

function PasswordCard({ loginId }: { loginId: string }) {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  async function change() {
    if (pw.length < 6) return setMsg("Use at least 6 characters.");
    const { error } = await createClient().auth.updateUser({ password: pw });
    setMsg(error ? error.message : "Password changed ✓");
    setPw("");
  }
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-medium">Login</h2>
      <p className="mb-4 text-xs text-muted">You log in with <strong>{loginId}</strong>. Ask your admin to change it.</p>
      <div className="flex flex-wrap gap-2">
        <input type="password" className="field max-w-xs" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="btn btn-ghost" onClick={change}>Change password</button>
      </div>
      {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
    </section>
  );
}
