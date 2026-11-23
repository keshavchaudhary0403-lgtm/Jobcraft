"use client";

import { useCallback, useState } from "react";

/** Calls /api/generate for a structured task. */
export function useGenerate<T>(task: "analysis" | "resume" | "outreach" | "linkedin", applicationId?: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = useCallback(
    async (extra?: Record<string, string>): Promise<T | null> => {
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task, applicationId, extra }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.data) throw new Error(data.error ?? "Something went wrong.");
        return data.data as T;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [task, applicationId],
  );
  return { run, busy, error };
}
