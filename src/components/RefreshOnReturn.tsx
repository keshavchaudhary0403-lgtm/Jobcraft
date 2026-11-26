"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Pages that list jobs - the ones that go stale when a job is added from the Chrome extension. */
const LISTS = new Set(["/", "/jobs", "/interview", "/negotiation"]);

/**
 * When you come back to this tab (e.g. after saving a job from the extension), re-fetch the page's data.
 * router.refresh() keeps what's on screen (typed text, scroll) and only merges in fresh server data.
 */
export function RefreshOnReturn() {
  const router = useRouter();
  const path = usePathname();
  const last = useRef(0);

  useEffect(() => {
    if (!LISTS.has(path)) return;
    const again = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last.current < 3000) return; // focus + visibility fire together
      last.current = now;
      router.refresh();
    };
    document.addEventListener("visibilitychange", again);
    window.addEventListener("focus", again);
    return () => {
      document.removeEventListener("visibilitychange", again);
      window.removeEventListener("focus", again);
    };
  }, [path, router]);

  return null;
}
