"use client";

import { useEffect, useState } from "react";

const THEMES = [
  { id: "gold", label: "Black & Gold", colors: ["#14213d", "#fca311"] },
  { id: "harmony", label: "Harmony", colors: ["#3d405b", "#e07a5f"] },
  { id: "summer", label: "Summer", colors: ["#023047", "#219ebc"] },
  { id: "sunset", label: "Sunset", colors: ["#355070", "#e56b6f"] },
  { id: "earthy", label: "Earthy", colors: ["#1f4d33", "#4c956c"] },
] as const;

/** Sets the saved palette before first paint (no flash). */
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `try{var t=localStorage.getItem("jc-theme2");if(t)document.documentElement.dataset.theme=t}catch(e){}`,
      }}
    />
  );
}

/** Temporary palette picker for choosing the brand colour on real screens. */
export function ThemeSwitcher() {
  const [theme, setTheme] = useState("gold");
  useEffect(() => {
    // Read the saved choice after mount (localStorage is browser-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.dataset.theme || "gold");
  }, []);
  function pick(id: string) {
    setTheme(id);
    document.documentElement.dataset.theme = id;
    localStorage.setItem("jc-theme2", id);
  }
  return (
    <div className="no-print fixed bottom-5 right-5 z-50 flex items-center gap-1 rounded-full bg-white p-1.5 shadow-2xl ring-1 ring-line">
      <span className="px-2 text-[0.78rem] font-medium text-muted">Palette</span>
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => pick(t.id)}
          className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.82rem] font-medium transition ${theme === t.id ? "bg-ink text-white" : "text-ink hover:bg-line-2"}`}
        >
          <span className="flex"><span className="h-3 w-3 rounded-full ring-2 ring-white" style={{ background: t.colors[0] }} /><span className="-ml-1 h-3 w-3 rounded-full ring-2 ring-white" style={{ background: t.colors[1] }} /></span>
          {t.label}
        </button>
      ))}
    </div>
  );
}
