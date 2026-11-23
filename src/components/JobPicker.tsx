"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import type { Application } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { CompanyAvatar } from "./ui";

type PickApp = Pick<Application, "id" | "company" | "role" | "status" | "analysis">;

/** Job tiles to pick from (no native dropdown). Writes application_id into the parent form. */
export function JobPicker({
  apps,
  preselect,
  otherLabel = "Another role",
  otherFields,
  onPick,
  compact = false,
}: {
  apps: PickApp[];
  preselect?: string;
  otherLabel?: string;
  otherFields: React.ReactNode;
  onPick?: (id: string) => void;
  /** Slim vertical list instead of tiles — for narrow columns. */
  compact?: boolean;
}) {
  const initial = apps.find((a) => a.id === preselect)?.id ?? apps[0]?.id ?? "";
  const [id, setId] = useState(initial);
  const pick = (v: string) => {
    setId(v);
    onPick?.(v);
  };
  if (compact)
    return (
      <div>
        <input type="hidden" name="application_id" value={id} />
        <div className="space-y-2">
          {apps.map((a) => {
            const an = a.analysis as Analysis | null;
            const on = id === a.id;
            return (
              <button key={a.id} type="button" onClick={() => pick(a.id)} className={`flex w-full items-center gap-3 rounded-2xl border-[1.5px] px-3 py-2.5 text-left transition ${on ? "border-side bg-side text-cream" : "border-line bg-card hover:border-brand/40"}`}>
                <CompanyAvatar name={a.company} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.92rem] font-semibold" title={a.role}>{a.role}</span>
                  <span className={`block truncate text-[0.76rem] ${on ? "text-cream/60" : "text-muted"}`}>{a.company}{a.status === "offer" ? " · Offer" : ""}</span>
                </span>
                {an && <span className={`text-[1rem] font-bold tabular-nums ${on ? "text-mustard" : ""}`}>{an.fit_score * 10}%</span>}
              </button>
            );
          })}
          <button type="button" onClick={() => pick("")} className={`flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-dashed px-3 py-2.5 text-[0.9rem] font-semibold transition ${id === "" ? "border-clay bg-clay-soft text-clay" : "border-line text-muted hover:border-clay/60 hover:text-clay"}`}>
            <span className="grid h-8 w-8 place-items-center rounded-full border-[1.5px] border-current"><Plus size={14} /></span>{otherLabel}
          </button>
        </div>
        {id === "" && <div className="mt-3 fade-up">{otherFields}</div>}
      </div>
    );

  return (
    <div>
      <input type="hidden" name="application_id" value={id} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {apps.map((a) => {
          const an = a.analysis as Analysis | null;
          const on = id === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => pick(a.id)}
              className={`relative flex flex-col rounded-[20px] border-[1.5px] p-4 text-left transition ${on ? "border-side bg-side text-cream" : "border-line bg-card hover:border-brand/40"}`}
            >
              <span className="flex items-center gap-2.5">
                <CompanyAvatar name={a.company} size={32} />
                <span className={`min-w-0 flex-1 truncate text-[0.84rem] ${on ? "text-cream/70" : "text-muted"}`}>{a.company}</span>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${on ? "bg-mustard text-side" : "border-[1.5px] border-line"}`}>{on && <Check size={13} strokeWidth={3} />}</span>
              </span>
              <span className="mt-3 line-clamp-2 text-[1.05rem] font-bold leading-snug" title={a.role}>{a.role}</span>
              <span className="mt-auto flex items-center gap-2 pt-3 text-[0.78rem]">
                {an && <span className={`text-[1.1rem] font-bold ${on ? "text-mustard" : "text-ink"}`}>{an.fit_score * 10}%<span className={`ml-1 font-sans text-[0.8rem] font-normal ${on ? "text-cream/60" : "text-muted"}`}>fit</span></span>}
                {a.status === "offer" && <span className="chip bg-good-soft py-0 text-good">Offer</span>}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => pick("")}
          className={`flex min-h-[124px] flex-col items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-dashed p-4 transition ${id === "" ? "border-clay bg-clay-soft text-clay" : "border-line text-muted hover:border-clay/60 hover:text-clay"}`}
        >
          <span className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-current"><Plus size={16} /></span>
          <span className="font-semibold">{otherLabel}</span>
        </button>
      </div>
      {id === "" && <div className="mt-4 fade-up">{otherFields}</div>}
    </div>
  );
}
