"use client";

import { CompanyWordmark } from "./CompanyWordmark";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import type { Application } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { CompanyAvatar, FitBadge } from "./ui";

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
  /** Slim vertical list instead of tiles - for narrow columns. */
  compact?: boolean;
}) {
  const initial = apps.find((a) => a.id === preselect)?.id ?? apps[0]?.id ?? "";
  const [id, setId] = useState(initial);
  const pick = (v: string) => {
    setId(v);
    onPick?.(v);
  };
  // Keep the picker short as jobs pile up: first few + the selected one, then "Show all".
  const LIMIT = compact ? 4 : 5;
  const [showAll, setShowAll] = useState(false);
  const head = apps.slice(0, LIMIT);
  const visible = showAll || apps.length <= LIMIT ? apps : head.some((a) => a.id === id) || !id ? head : [...head, apps.find((a) => a.id === id)!].filter(Boolean);
  const more = apps.length > LIMIT && (
    <button type="button" onClick={() => setShowAll(!showAll)} className="pill-nav mt-3">
      {showAll ? "Show fewer" : `Show all ${apps.length} jobs`}
    </button>
  );
  if (compact)
    return (
      <div>
        <input type="hidden" name="application_id" value={id} />
        <div className="space-y-2">
          {visible.map((a) => {
            const an = a.analysis as Analysis | null;
            const on = id === a.id;
            return (
              <button key={a.id} type="button" onClick={() => pick(a.id)} className={`flex w-full items-center gap-3 rounded-2xl border-[1.5px] px-3 py-2.5 text-left transition ${on ? "border-brand bg-card" : "border-line bg-card hover:border-brand/40"}`}>
                <CompanyAvatar name={a.company} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.92rem] font-semibold" data-tip={a.role}>{a.role}</span>
                  <span className="block truncate text-[0.78rem] font-bold text-ink">{a.company}{a.status === "offer" ? " · Offer" : ""}</span>
                </span>
                {an && <FitBadge value={an.fit_score * 10} size="sm" />}
              </button>
            );
          })}
          <button type="button" onClick={() => pick("")} className={`flex w-full items-center gap-3 rounded-2xl border-[1.5px] bg-card px-3 py-2.5 text-[0.9rem] font-semibold transition ${id === "" ? "border-brand" : "border-line hover:border-brand/40"}`}>
            <span data-tone="1" className="tone-chip grid h-8 w-8 place-items-center rounded-xl bg-line-2"><Plus size={14} /></span>{otherLabel}
          </button>
        </div>
        {more}
        {id === "" && <div className="mt-3 fade-up">{otherFields}</div>}
      </div>
    );

  return (
    <div>
      <input type="hidden" name="application_id" value={id} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((a) => {
          const an = a.analysis as Analysis | null;
          const on = id === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => pick(a.id)}
              className={`relative flex flex-col rounded-[20px] border-2 p-4 text-left transition ${on ? "border-brand bg-card" : "border-line bg-card hover:border-brand/40"}`}
            >
              <span className="flex items-center gap-2.5">
                <CompanyWordmark name={a.company} height={30} iconSize={32} className="flex-1" nameClass="truncate text-[0.9rem] font-bold text-ink" />
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${on ? "bg-brand text-white" : "border-[1.5px] border-line"}`}>{on && <Check size={13} strokeWidth={3} />}</span>
              </span>
              <span className="mt-3 line-clamp-2 font-display text-[1.05rem] font-bold leading-snug" data-tip={a.role}>{a.role}</span>
              <span className="mt-auto flex items-center gap-2 pt-3 text-[0.78rem]">
                {an && <FitBadge value={an.fit_score * 10} size="sm" />}
                {a.status === "offer" && <span className="chip bg-good-soft py-0 text-good">Offer</span>}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => pick("")}
          className={`relative flex min-h-[124px] flex-col items-start justify-between rounded-[20px] border-2 p-4 text-left transition ${id === "" ? "border-brand bg-card" : "border-line bg-card hover:border-brand/40"}`}
        >
          <span className="flex w-full items-center justify-between">
            <span data-tone="1" className="tone-chip grid h-9 w-9 place-items-center rounded-xl bg-line-2"><Plus size={16} /></span>
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${id === "" ? "bg-brand text-white" : "border-[1.5px] border-line"}`}>{id === "" && <Check size={13} strokeWidth={3} />}</span>
          </span>
          <span className="font-display text-[1.02rem] font-bold">{otherLabel}</span>
        </button>
      </div>
      {more}
      {id === "" && <div className="mt-4 fade-up">{otherFields}</div>}
    </div>
  );
}
