"use client";

import { useState } from "react";
import type { Application } from "@/lib/types";

export function AppOrCustom({ apps, preselect }: { apps: Pick<Application, "id" | "company" | "role">[]; preselect?: string }) {
  const [appId, setAppId] = useState(preselect && apps.some((a) => a.id === preselect) ? preselect : apps[0]?.id ?? "");
  return (
    <div className="space-y-3">
      <select name="application_id" className="field" value={appId} onChange={(e) => setAppId(e.target.value)} aria-label="Job">
        {apps.map((a) => (
          <option key={a.id} value={a.id}>{a.role} · {a.company}</option>
        ))}
        <option value="">Another job…</option>
      </select>
      {!appId && (
        <div className="grid gap-3 sm:grid-cols-2 fade-up">
          <input name="company" className="field" required placeholder="Company" />
          <input name="role" className="field" required placeholder="Role" />
          <textarea name="jd" className="field sm:col-span-2" rows={4} placeholder="Job description (recommended)" />
        </div>
      )}
    </div>
  );
}
