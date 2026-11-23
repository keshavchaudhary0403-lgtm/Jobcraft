"use client";

import { useEffect, useState } from "react";

const KEY = "jc-palette";
const THEMES = [
  { id: "indigo", label: "Ink & Indigo", from: "Ashby", colors: ["#141415", "#473bce"] },
  { id: "cream", label: "Indigo & Cream", from: "Deel", colors: ["#201547", "#5938b7"] },
  { id: "blurple", label: "Navy & Blurple", from: "Stripe", colors: ["#061b31", "#533afd"] },
  { id: "coral", label: "Charcoal & Coral", from: "Gusto", colors: ["#1c1b1a", "#f45d48"] },
  { id: "graphite", label: "Graphite", from: "Notion & Vercel", colors: ["#0f0f10", "#8b8b94"] },
] as const;

/** Applies the saved palette before first paint (no flash). */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("${KEY}");if(t)document.documentElement.dataset.theme=t}catch(e){}` }} />;
}

/** Temporary palette picker — used to choose the final colours on real screens. */
export function ThemeSwitcher() {
  const [theme, setTheme] = useState<string>("indigo");
  useEffect(() => {
    // Read the saved choice after mount (localStorage is browser-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.dataset.theme || "indigo");
  }, []);
  function pick(id: string) {
    setTheme(id);
    document.documentElement.setAttribute("data-theme", id);
    localStorage.setItem(KEY, id);
  }
  return (
    <div className="no-print fixed bottom-5 right-5 z-50 w-64 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-line">
      <div className="px-2 pb-1.5 pt-1 text-[0.78rem] font-medium text-muted">Palette</div>
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => pick(t.id)}
          className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${theme === t.id ? "bg-line-2 ring-1 ring-line" : "hover:bg-line-2"}`}
        >
          <span className="flex">
            <span className="h-5 w-5 rounded-full ring-2 ring-white" style={{ background: t.colors[0] }} />
            <span className="-ml-1.5 h-5 w-5 rounded-full ring-2 ring-white" style={{ background: t.colors[1] }} />
          </span>
          <span className="flex-1">
            <span className="block text-[0.88rem] font-medium leading-tight">{t.label}</span>
            <span className="block text-[0.74rem] text-faint">from {t.from}</span>
          </span>
          {theme === t.id && <span className="h-2 w-2 rounded-full bg-brand" />}
        </button>
      ))}
    </div>
  );
}
