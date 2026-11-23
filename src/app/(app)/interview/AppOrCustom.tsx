"use client";

import { useState } from "react";
import type { Application } from "@/lib/types";

/** Pick a tracked job, or type a company + role for a one-off practice. */
export function AppOrCustom({ apps, preselect }: { apps: Pick<Application, "id" | "company" | "role">[]; preselect?: string }) {
  const [appId, setAppId] = useState(preselect && apps.some((a) => a.id === preselect) ? preselect : apps[0]?.id ?? "");
  return (
    <div className="space-y-4">
      <div>
        <label className="label">Which job?</label>
        <select name="application_id" className="field" value={appId} onChange={(e) => setAppId(e.target.value)}>
          {apps.map((a) => (
            <option key={a.id} value={a.id}>{a.role} @ {a.company}</option>
          ))}
          <option value="">Another job (type it below)</option>
        </select>
      </div>
      {!appId && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Company</label>
            <input name="company" className="field" required />
          </div>
          <div>
            <label className="label">Role</label>
            <input name="role" className="field" required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Job description (recommended)</label>
            <textarea name="jd" className="field" rows={6} />
          </div>
        </div>
      )}
    </div>
  );
}
