"use client";

import { useState } from "react";
import { Check, ExternalLink, IndianRupee, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/client-ui";
import type { Application } from "@/lib/types";
import { JobPicker } from "@/components/JobPicker";

type Defaults = { city: string; current_ctc: string; experience: string; strongest_proof: string };
type A = Pick<Application, "id" | "company" | "role" | "status" | "company_type" | "location" | "analysis">;

export function NegotiationForm({ apps, preselect, defaults, userId }: { apps: A[]; preselect?: string; defaults: Defaults; userId: string }) {
  const firstId = apps.find((a) => a.id === preselect)?.id ?? apps[0]?.id ?? "";
  const [appId, setAppId] = useState(firstId);
  const complete = (v: Defaults) => !!(v.current_ctc.trim() && v.experience.trim() && v.city.trim() && v.strongest_proof.trim());
  const [saved, setSaved] = useState(defaults);
  const [vals, setVals] = useState(defaults);
  const [edit, setEdit] = useState(!complete(defaults));
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const dirty = JSON.stringify(vals) !== JSON.stringify(saved);

  function cancel() {
    setVals(saved);
    setSaveMsg("");
    setEdit(false);
  }
  async function save() {
    setSaving(true);
    setSaveMsg("");
    const t = (x: string) => x.trim() || null;
    const { error } = await createClient()
      .from("profiles")
      .update({ current_ctc: t(vals.current_ctc), experience_years: t(vals.experience), city: t(vals.city), strongest_proof: t(vals.strongest_proof) })
      .eq("id", userId);
    setSaving(false);
    if (error) return setSaveMsg("Couldn't save. Try again.");
    setSaved(vals);
    setEdit(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }
  const a = apps.find((x) => x.id === appId);
  const q = encodeURIComponent(`${a?.role ?? ""} salary ${a?.location ?? defaults.city}`.trim());

  return (
    <>
      <div className="border-b border-line px-5 py-4">
        <div className="font-bold">Which offer?</div>
      </div>
      <div className="space-y-5 p-5">
        <JobPicker
          apps={apps}
          preselect={firstId}
          otherLabel="Offer not in my jobs"
          onPick={setAppId}
          otherFields={
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="role" className="field" placeholder="Role offered" />
              <input name="company_type" className="field" placeholder="Company type (startup, MNC…)" />
            </div>
          }
        />
        {a && (
          <>
            <input type="hidden" name="role" value={a.role} />
            <input type="hidden" name="company_type" value={a.company_type ?? "company"} />
          </>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Offered CTC</label>
            <div className="relative">
              <IndianRupee size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input name="offered_ctc" className="field pl-8" required placeholder="9 LPA" />
            </div>
          </div>
          <div>
            <label className="label flex justify-between">
              <span>Market range</span>
              <span className="flex gap-2.5 font-normal">
                <a className="flex items-center gap-0.5 text-brand-ink hover:underline" target="_blank" rel="noreferrer" href={`https://www.ambitionbox.com/search?q=${q}`}>AmbitionBox <ExternalLink size={10} /></a>
                <a className="flex items-center gap-0.5 text-brand-ink hover:underline" target="_blank" rel="noreferrer" href={`https://www.glassdoor.co.in/Search/results.htm?keyword=${q}`}>Glassdoor <ExternalLink size={10} /></a>
              </span>
            </label>
            <div className="relative">
              <IndianRupee size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input name="market_range" className="field pl-8" required placeholder="8–12 LPA" />
            </div>
          </div>
        </div>

        <div className={`overflow-hidden rounded-xl border transition ${edit ? "border-brand/40" : "border-line"}`}>
          <div className="flex items-center justify-between gap-3 border-b border-line bg-line-2/50 px-4 py-2.5">
            <span className="font-bold">Your details</span>
            {edit ? (
              <span className="flex items-center gap-2">
                {saveMsg && <span className="text-[0.82rem] text-bad">{saveMsg}</span>}
                {complete(saved) && <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>Cancel</button>}
                <button type="button" className="btn btn-primary btn-sm" disabled={saving || !complete(vals) || !dirty && complete(saved)} onClick={save}>
                  {saving ? <Spinner size={13} /> : <Check size={14} />} Save
                </button>
              </span>
            ) : (
              <span className="flex items-center gap-3">
                {justSaved && <span className="flex items-center gap-1 text-[0.82rem] text-good"><Check size={13} /> Saved to your profile</span>}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>
                  <Pencil size={13} /> Edit
                </button>
              </span>
            )}
          </div>
          {/* Always submitted with the form */}
          <input type="hidden" name="current_ctc" value={saved.current_ctc} />
          <input type="hidden" name="experience" value={saved.experience} />
          <input type="hidden" name="city" value={saved.city} />
          <input type="hidden" name="strongest_proof" value={saved.strongest_proof} />
          {edit ? (
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <div><label className="label">Current CTC</label><input className="field" value={vals.current_ctc} onChange={(e) => setVals({ ...vals, current_ctc: e.target.value })} placeholder="₹12 LPA" /></div>
              <div><label className="label">Experience</label><input className="field" value={vals.experience} onChange={(e) => setVals({ ...vals, experience: e.target.value })} placeholder="5 years" /></div>
              <div><label className="label">City</label><input className="field" value={vals.city} onChange={(e) => setVals({ ...vals, city: e.target.value })} /></div>
              <div className="sm:col-span-3"><label className="label">Best results (with numbers)</label><textarea className="field" rows={3} value={vals.strongest_proof} onChange={(e) => setVals({ ...vals, strongest_proof: e.target.value })} /></div>
              <p className="text-[0.8rem] text-muted sm:col-span-3">Saving also updates My profile.</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              <div className="grid grid-cols-3 divide-x divide-line">
                {[
                  ["Current CTC", saved.current_ctc],
                  ["Experience", saved.experience],
                  ["City", saved.city],
                ].map(([k, v]) => (
                  <div key={k} className="px-4 py-3">
                    <div className="text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-muted">{k}</div>
                    <div className="mt-0.5 font-medium">{v || "—"}</div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3">
                <div className="text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-muted">Best results</div>
                <p className="mt-0.5 leading-relaxed text-slate-800">{saved.strongest_proof || "—"}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-line bg-slate-50/60 px-5 py-3.5">
        {edit && <span className="mr-auto text-[0.85rem] text-muted">Save your details to continue</span>}
        <button className="btn btn-brand" disabled={edit}>Start practice</button>
      </div>
    </>
  );
}
