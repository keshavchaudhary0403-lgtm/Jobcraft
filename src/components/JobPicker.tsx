"use client";

import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import type { Application } from "@/lib/types";
import { JobRowContent } from "./JobTiles";

type PickApp = Pick<Application, "id" | "company" | "role" | "status" | "analysis" | "job_url" | "company_domain" | "company_logo"> & Partial<Pick<Application, "location">>;

/**
 * Pick one job for practice: the app's standard compact job rows with a radio dot, a search box (when there are
 * more than a handful) and "Another role" as the last row. Writes application_id into the parent form.
 */
export function JobPicker({
  apps,
  preselect,
  otherLabel = "Another role",
  otherFields,
  onPick,
}: {
  apps: PickApp[];
  preselect?: string;
  otherLabel?: string;
  otherFields: React.ReactNode;
  onPick?: (id: string) => void;
  /** Kept for compatibility; the list layout works in narrow columns too. */
  compact?: boolean;
}) {
  const initial = apps.find((a) => a.id === preselect)?.id ?? apps[0]?.id ?? "";
  const [id, setId] = useState(initial);
  const [query, setQuery] = useState("");
  const pick = (v: string) => {
    setId(v);
    onPick?.(v);
  };
  const q = query.trim().toLowerCase();
  const shown = apps.filter((a) => !q || `${a.role} ${a.company} ${a.location ?? ""}`.toLowerCase().includes(q));
  const row = (on: boolean) => `flex min-h-[62px] w-full items-center gap-4 px-4 py-3 text-left transition ${on ? "bg-brand-soft/70" : "hover:bg-line-2/70"}`;

  return (
    <div>
      <input type="hidden" name="application_id" value={id} />
      {apps.length > 5 && (
        <label className="relative mb-3 block">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${apps.length} jobs by role, company or city`}
            aria-label="Search jobs"
            className="h-[2.6rem] w-full rounded-full border-[1.5px] border-line bg-card pl-10 pr-10 text-[0.92rem] outline-none transition placeholder:text-faint focus:border-brand"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-faint hover:bg-line-2 hover:text-ink"><X size={14} /></button>
          )}
        </label>
      )}
      <ul role="radiogroup" aria-label="Job" className="thin-scroll max-h-[22rem] divide-y divide-line overflow-y-auto rounded-2xl border border-line">
        {shown.map((a) => {
          const on = id === a.id;
          return (
            <li key={a.id}>
              <button type="button" role="radio" aria-checked={on} onClick={() => pick(a.id)} className={row(on)}>
                {/* Runtime rows are full applications (pages select *), so the shared row can render them. */}
                <JobRowContent a={a as Application} lead={<Dot on={on} />} showNext={false} showTime={false} />
              </button>
            </li>
          );
        })}
        {!shown.length && (
          <li className="px-4 py-6 text-center text-[0.9rem] text-muted">No jobs match &ldquo;{query}&rdquo;. <button type="button" onClick={() => setQuery("")} className="font-semibold text-brand">Clear search</button></li>
        )}
        <li>
          <button type="button" role="radio" aria-checked={id === ""} onClick={() => pick("")} className={row(id === "")}>
            <Dot on={id === ""} />
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-line-2 text-brand"><Plus size={15} /></span>
            <span className="flex-1 font-semibold text-ink">{otherLabel}</span>
          </button>
        </li>
      </ul>
      {id === "" && <div className="mt-4 fade-up">{otherFields}</div>}
    </div>
  );
}

/** Radio dot for the picker rows. */
function Dot({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={`grid h-[1.3rem] w-[1.3rem] shrink-0 place-items-center rounded-full border-2 transition ${on ? "border-brand" : "border-line bg-white"}`}>
      {on && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
    </span>
  );
}
