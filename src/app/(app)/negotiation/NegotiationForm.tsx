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

        <div className="rounded-xl border border-line bg-slate-50/60 p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[0.88rem] font-medium">Your details</span>
            {!edit && <button type="button" className="btn-quiet h-7 gap-1 px-2 text-[0.82rem]" onClick={() => setEdit(true)}><Pencil size={12} /> Edit</button>}
          </div>
          <div className={edit ? "grid gap-3 sm:grid-cols-3" : "hidden"}>
            <input name="current_ctc" className="field" required defaultValue={defaults.current_ctc} placeholder="Current CTC" />
            <input name="experience" className="field" required defaultValue={defaults.experience} placeholder="Experience" />
            <input name="city" className="field" required defaultValue={defaults.city} placeholder="City" />
            <textarea name="strongest_proof" className="field sm:col-span-3" rows={2} required defaultValue={defaults.strongest_proof} placeholder="Your strongest results with numbers" />
          </div>
          {!edit && (
            <div className="flex flex-wrap gap-1.5">
              {[defaults.current_ctc && `Current ${defaults.current_ctc}`, defaults.experience, defaults.city].filter(Boolean).map((t) => (
                <span key={t} className="chip border border-line bg-white text-slate-600">{t}</span>
              ))}
              <span className="chip max-w-full truncate border border-line bg-white text-slate-600">{defaults.strongest_proof}</span>
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
