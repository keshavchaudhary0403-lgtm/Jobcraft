"use client";

import { useEffect, useState } from "react";

const KEY = "jc-paper";
const PAPERS = [
  { id: "cream", label: "Cream", hint: "Original — warm and soft", bg: "#f7f5f2", card: "#ffffff" },
  { id: "ivory", label: "Ivory", hint: "Warmer, cards gently warm", bg: "#f8f5ee", card: "#fffdf9" },
  { id: "mist", label: "Lavender mist", hint: "A whisper of the brand violet", bg: "#f6f4fb", card: "#ffffff" },
  { id: "porcelain", label: "Porcelain", hint: "Cool, crisp and neutral", bg: "#f5f6f8", card: "#ffffff" },
  { id: "linen", label: "Linen", hint: "Soft greige, calm, editorial", bg: "#f2efea", card: "#fdfcfa" },
  { id: "snow", label: "Snow", hint: "Near-pure white, cards lift by shadow", bg: "#fcfcfd", card: "#ffffff" },
] as const;

/** Applies the saved background shade before first paint (no flash). */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("${KEY}");if(t)document.documentElement.setAttribute("data-paper",t)}catch(e){}` }} />;
}

/** Temporary picker for choosing the final "white" on real screens. */
export function ThemeSwitcher() {
  const [paper, setPaper] = useState<string>("cream");
  useEffect(() => {
    // Read the saved choice after mount (localStorage is browser-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaper(document.documentElement.getAttribute("data-paper") || "cream");
  }, []);
  function pick(id: string) {
    setPaper(id);
    document.documentElement.setAttribute("data-paper", id);
    localStorage.setItem(KEY, id);
  }
  return (
    <div className="no-print fixed bottom-5 right-5 z-50 w-72 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5">
      <div className="px-2 pb-1.5 pt-1 text-[0.78rem] font-medium text-muted">Background shade</div>
      {PAPERS.map((p) => (
        <button
          key={p.id}
          onClick={() => pick(p.id)}
          className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${paper === p.id ? "bg-brand-soft ring-1 ring-brand/30" : "hover:bg-black/[.03]"}`}
        >
          <span className="relative h-7 w-9 shrink-0 overflow-hidden rounded-md ring-1 ring-black/10" style={{ background: p.bg }}>
            <span className="absolute bottom-1 right-1 h-3.5 w-5 rounded-[3px] ring-1 ring-black/10" style={{ background: p.card }} />
          </span>
          <span className="flex-1">
            <span className="block text-[0.88rem] font-medium leading-tight">{p.label}</span>
            <span className="block text-[0.74rem] text-faint">{p.hint}</span>
          </span>
          {paper === p.id && <span className="h-2 w-2 rounded-full bg-brand" />}
        </button>
      ))}
    </div>
  );
}
