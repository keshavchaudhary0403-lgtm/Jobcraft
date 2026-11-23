"use client";

import { Trash2 } from "lucide-react";
import { useAsk } from "./client-ui";

/** Deletes a practice session — only after an app-styled confirmation. */
export function DeleteSessionButton({ action }: { action: () => Promise<void> }) {
  const [ask, dialog] = useAsk();
  return (
    <>
      {dialog}
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={async () => {
          const ok = await ask({ title: "Delete this session?", body: "The conversation, transcript and scorecard are removed. This can't be undone.", confirm: "Delete", danger: true });
          if (ok !== null) await action();
        }}
      >
        <Trash2 size={14} /> Delete
      </button>
    </>
  );
}
