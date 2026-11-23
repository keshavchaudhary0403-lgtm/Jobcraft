"use client";

import { useState } from "react";
import { ExternalLink, IndianRupee, Pencil } from "lucide-react";
import type { Application } from "@/lib/types";
import { JobPicker } from "@/components/JobPicker";

type Defaults = { city: string; current_ctc: string; experience: string; strongest_proof: string };
type A = Pick<Application, "id" | "company" | "role" | "status" | "company_type" | "location" | "analysis">;

export function NegotiationForm({ apps, preselect, defaults }: { apps: A[]; preselect?: string; defaults: Defaults }) {
  const firstId = apps.find((a) => a.id === preselect)?.id ?? apps[0]?.id ?? "";
  const [appId, setAppId] = useState(firstId);
  const [edit, setEdit] = useState(!defaults.current_ctc || !defaults.strongest_proof || !defaults.city || !defaults.experience);
  const a = apps.find((x) => x.id === appId);
  const q = encodeURIComponent(`${a?.role ?? ""} salary ${a?.location ?? defaults.city}`.trim());

  return (
    <>
      <div className="border-b border-line px-5 py-4">
        <div className="font-semibold">Which offer?</div>
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

        <div className="overflow-hidden rounded-xl border border-line">
          <div className="flex items-center justify-between border-b border-line bg-line-2/50 px-4 py-2.5">
            <span className="font-semibold">Your details</span>
            {!edit && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>
                <Pencil size={13} /> Edit
              </button>
            )}
          </div>
          <div className={edit ? "grid gap-3 p-4 sm:grid-cols-3" : "hidden"}>
            <div><label className="label">Current CTC</label><input name="current_ctc" className="field" required defaultValue={defaults.current_ctc} placeholder="₹12 LPA" /></div>
            <div><label className="label">Experience</label><input name="experience" className="field" required defaultValue={defaults.experience} placeholder="5 years" /></div>
            <div><label className="label">City</label><input name="city" className="field" required defaultValue={defaults.city} /></div>
            <div className="sm:col-span-3"><label className="label">Best results (with numbers)</label><textarea name="strongest_proof" className="field" rows={3} required defaultValue={defaults.strongest_proof} /></div>
          </div>
          {!edit && (
            <div className="divide-y divide-line">
              <div className="grid grid-cols-3 divide-x divide-line">
                {[
                  ["Current CTC", defaults.current_ctc],
                  ["Experience", defaults.experience],
                  ["City", defaults.city],
                ].map(([k, v]) => (
                  <div key={k} className="px-4 py-3">
                    <div className="text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-muted">{k}</div>
                    <div className="mt-0.5 font-medium">{v || "—"}</div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3">
                <div className="text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-muted">Best results</div>
                <p className="mt-0.5 leading-relaxed text-slate-800">{defaults.strongest_proof || "—"}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end border-t border-line bg-slate-50/60 px-5 py-3.5">
        <button className="btn btn-brand">Start practice</button>
      </div>
    </>
  );
}
