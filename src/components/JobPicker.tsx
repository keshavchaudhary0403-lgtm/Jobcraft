"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import type { Application } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { CompanyAvatar, MatchChip } from "./ui";

type PickApp = Pick<Application, "id" | "company" | "role" | "status" | "analysis">;

/** Selectable job cards (no native dropdown). Writes application_id into the parent form. */
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
}) {
  const initial = apps.find((a) => a.id === preselect)?.id ?? apps[0]?.id ?? "";
  const [id, setId] = useState(initial);
  const pick = (v: string) => {
    setId(v);
    onPick?.(v);
  };
  return (
    <div>
      <input type="hidden" name="application_id" value={id} />
      <div className="grid gap-2.5 sm:grid-cols-2">
        {apps.map((a) => {
          const an = a.analysis as Analysis | null;
          const on = id === a.id;
          return (
            <button key={a.id} type="button" data-on={on} onClick={() => pick(a.id)} className="option flex items-center gap-3 p-3">
              <CompanyAvatar name={a.company} size={34} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{a.role}</div>
                <div className="flex items-center gap-2 truncate text-[0.85rem] text-muted">
                  {a.company}
                  {a.status === "offer" && <span className="chip bg-good-soft py-0 text-good">Offer</span>}
                </div>
              </div>
              {an && <MatchChip score={an.fit_score} />}
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${on ? "border-brand bg-brand text-white" : "border-line"}`}>{on && <Check size={12} />}</span>
            </button>
          );
        })}
        <button type="button" data-on={id === ""} onClick={() => pick("")} className="option flex items-center gap-3 p-3">
          <div className="grid h-[34px] w-[34px] place-items-center rounded-[10px] border border-dashed border-line text-faint"><Plus size={16} /></div>
          <div className="flex-1 font-medium">{otherLabel}</div>
          <span className={`grid h-5 w-5 place-items-center rounded-full border ${id === "" ? "border-brand bg-brand text-white" : "border-line"}`}>{id === "" && <Check size={12} />}</span>
        </button>
      </div>
      {id === "" && <div className="mt-4 fade-up">{otherFields}</div>}
    </div>
  );
}
