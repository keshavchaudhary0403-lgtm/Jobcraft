"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { Application } from "@/lib/types";

type Defaults = { city: string; current_ctc: string; experience: string; strongest_proof: string };

export function NegotiationForm({
  apps,
  preselect,
  defaults,
}: {
  apps: Pick<Application, "id" | "company" | "role" | "status" | "company_type" | "location">[];
  preselect?: string;
  defaults: Defaults;
}) {
  const initial = apps.find((a) => a.id === preselect) ?? apps.find((a) => a.status === "offer") ?? apps[0] ?? null;
  const [appId, setAppId] = useState(initial?.id ?? "");
  const a = apps.find((x) => x.id === appId);
  const [more, setMore] = useState(!defaults.current_ctc || !defaults.strongest_proof || !defaults.city || !defaults.experience);
  const q = encodeURIComponent(`${a?.role ?? ""} salary ${a?.location ?? defaults.city}`.trim());

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Offer from</label>
        <select name="application_id" className="field" value={appId} onChange={(e) => setAppId(e.target.value)}>
          {apps.map((x) => (
            <option key={x.id} value={x.id}>{x.role} · {x.company}{x.status === "offer" ? "  — offer" : ""}</option>
          ))}
          <option value="">Not in my jobs</option>
        </select>
      </div>
      {!appId && (
        <div className="grid gap-3 sm:grid-cols-2 fade-up">
          <input name="role" className="field" required placeholder="Role offered" />
          <input name="company_type" className="field" required placeholder="Company type (startup, MNC…)" />
        </div>
      )}
      {a && (
        <>
          <input type="hidden" name="role" value={a.role} />
          <input type="hidden" name="company_type" value={a.company_type ?? "company"} />
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Offered CTC</label>
          <input name="offered_ctc" className="field" required placeholder="₹9 LPA" />
        </div>
        <div>
          <label className="label">Market range you found</label>
          <input name="market_range" className="field" required placeholder="₹8–12 LPA" />
        </div>
      </div>
      <div className="flex gap-3 text-xs">
        <a className="flex items-center gap-1 text-brand-ink hover:underline" target="_blank" rel="noreferrer" href={`https://www.ambitionbox.com/search?q=${q}`}>AmbitionBox <ExternalLink size={11} /></a>
        <a className="flex items-center gap-1 text-brand-ink hover:underline" target="_blank" rel="noreferrer" href={`https://www.glassdoor.co.in/Search/results.htm?keyword=${q}`}>Glassdoor <ExternalLink size={11} /></a>
      </div>

      <button type="button" className="flex items-center gap-1 text-sm text-muted hover:text-ink" onClick={() => setMore(!more)}>
        <ChevronDown size={16} className={`transition ${more ? "rotate-180" : ""}`} /> Your details
      </button>
      <div className={`grid gap-3 sm:grid-cols-3 ${more ? "fade-up" : "hidden"}`}>
        <input name="current_ctc" className="field" required defaultValue={defaults.current_ctc} placeholder="Current CTC" />
        <input name="experience" className="field" required defaultValue={defaults.experience} placeholder="Experience" />
        <input name="city" className="field" required defaultValue={defaults.city} placeholder="City" />
        <textarea name="strongest_proof" className="field sm:col-span-3" rows={2} required defaultValue={defaults.strongest_proof} placeholder="Your strongest results with numbers" />
      </div>
      <button className="btn btn-brand">Start practice</button>
    </div>
  );
}
