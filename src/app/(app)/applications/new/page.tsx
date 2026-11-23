"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui";

export default function NewApplication() {
  const router = useRouter();
  const [f, setF] = useState({ company: "", role: "", job_url: "", company_type: "", hiring_contact: "", jd: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

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
      .insert({ ...f, user_id: user!.id, job_url: f.job_url || null, company_type: f.company_type || null, hiring_contact: f.hiring_contact || null })
      .select("id")
      .single();
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    router.push(`/applications/${data.id}`);
  }

  return (
    <>
      <PageHeader eyebrow="New job" title="Add a job you want">
        Paste the <strong>full</strong> job description — every line helps the JD Decoder.
      </PageHeader>
      <form onSubmit={submit} className="card space-y-4 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Company *</label>
            <input className="field" required value={f.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g. Nestara" />
          </div>
          <div>
            <label className="label">Role *</label>
            <input className="field" required value={f.role} onChange={(e) => set("role", e.target.value)} placeholder="e.g. Digital Marketing Manager" />
          </div>
          <div>
            <label className="label">Company type</label>
            <input className="field" value={f.company_type} onChange={(e) => set("company_type", e.target.value)} placeholder="startup / MNC / agency / D2C…" />
          </div>
          <div>
            <label className="label">Job link</label>
            <input className="field" value={f.job_url} onChange={(e) => set("job_url", e.target.value)} placeholder="https://…" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Hiring person (if you know)</label>
            <input className="field" value={f.hiring_contact} onChange={(e) => set("hiring_contact", e.target.value)} placeholder="Name, title, LinkedIn URL" />
          </div>
        </div>
        <div>
          <label className="label">Full job description *</label>
          <textarea className="field" rows={14} required value={f.jd} onChange={(e) => set("jd", e.target.value)} placeholder="Paste the whole JD here…" />
        </div>
        {err && <p className="text-sm text-warm">{err}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create workspace"}</button>
      </form>
    </>
  );
}
