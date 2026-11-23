"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";
import type { Application, Status } from "@/lib/types";
import type { Analysis } from "@/lib/tasks";
import { createClient } from "@/lib/supabase/client";
import { CompanyAvatar, MatchChip, STATUS_META, timeAgo } from "./ui";

const COLUMNS: { key: string; label: string; statuses: Status[]; hint: string }[] = [
  { key: "saved", label: "Saved", statuses: ["saved"], hint: "Analyse, tailor, reach out" },
  { key: "applied", label: "Applied", statuses: ["applied"], hint: "Waiting to hear back" },
  { key: "interviewing", label: "Interviewing", statuses: ["interviewing"], hint: "Practise before each round" },
  { key: "offer", label: "Offer", statuses: ["offer"], hint: "Check it, then negotiate" },
  { key: "closed", label: "Closed", statuses: ["rejected", "withdrawn"], hint: "Rejected or withdrawn" },
];

/** Kanban view of the pipeline — drag a job to change its stage. */
export function JobBoard({ apps }: { apps: Application[] }) {
  const router = useRouter();
  const [items, setItems] = useState(apps);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  async function move(id: string, col: (typeof COLUMNS)[number]) {
    const a = items.find((x) => x.id === id);
    if (!a || col.statuses.includes(a.status)) return;
    const status = col.statuses[0];
    const patch: Partial<Application> = { status };
    if (status === "applied" && !a.applied_on) patch.applied_on = new Date().toISOString().slice(0, 10);
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await createClient().from("applications").update(patch).eq("id", id);
    if (error) setItems(apps);
    router.refresh();
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2">
      <div className="grid min-w-[1050px] grid-cols-5 gap-3">
        {COLUMNS.map((col) => {
          const list = items.filter((a) => col.statuses.includes(a.status));
          const meta = STATUS_META[col.statuses[0]];
          return (
            <section
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col.key);
              }}
              onDragLeave={() => setOver((o) => (o === col.key ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                if (dragId) move(dragId, col);
                setDragId(null);
              }}
              className={`flex min-h-[420px] flex-col rounded-2xl border p-2.5 transition ${over === col.key ? "border-brand/50 bg-brand-soft/60" : "border-line bg-line-2/50"}`}
            >
              <header className="mb-2 px-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  <span className="font-semibold">{col.label}</span>
                  <span className="ml-auto rounded-full bg-white px-2 text-[0.75rem] tabular-nums text-muted ring-1 ring-line">{list.length}</span>
                </div>
                <div className="mt-0.5 text-[0.78rem] text-faint">{col.hint}</div>
              </header>
              <div className="flex flex-1 flex-col gap-2">
                {list.map((a) => {
                  const an = a.analysis as Analysis | null;
                  return (
                    <Link
                      key={a.id}
                      href={`/jobs/${a.id}`}
                      draggable
                      onDragStart={(e) => {
                        setDragId(a.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDragId(null)}
                      className={`group card card-hover block cursor-grab p-3 active:cursor-grabbing ${dragId === a.id ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <CompanyAvatar name={a.company} size={26} />
                        <span className="min-w-0 flex-1 truncate text-[0.84rem] font-medium" title={a.company}>{a.company}</span>
                        <GripVertical size={14} className="shrink-0 text-faint opacity-0 transition group-hover:opacity-100" />
                      </div>
                      <div className="mt-2 line-clamp-2 text-[0.92rem] font-semibold leading-snug">{a.role}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {an ? <MatchChip score={an.fit_score} /> : <span className="chip bg-slate-100 text-slate-500">Not analysed</span>}
                        {a.tailored_resume && <span className="chip bg-brand-soft text-brand-ink">Resume</span>}
                        <span className="ml-auto text-[0.72rem] text-faint">{timeAgo(a.updated_at)}</span>
                      </div>
                    </Link>
                  );
                })}
                {list.length === 0 && (
                  <div className={`grid flex-1 place-items-center rounded-xl border border-dashed text-[0.82rem] text-faint ${over === col.key ? "border-brand/40" : "border-line"}`}>
                    Drop a job here
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
