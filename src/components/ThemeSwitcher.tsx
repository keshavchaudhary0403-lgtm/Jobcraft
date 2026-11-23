"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Palette, X } from "lucide-react";

/**
 * Temporary "theme studio": pick any brand + sidebar colour and the whole app
 * recolours live. Every other shade (tints, hover, text-on-brand, background) is derived.
 */

type Picked = { brand: string; side: string };
const KEY = "jc-studio";
const DEFAULT: Picked = { brand: "#6236ff", side: "#14112b" };

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Same logic as the inline script below — keep in sync. */
function apply({ brand, side }: Picked) {
  const r = document.documentElement.style;
  const mix = (c: string, p: number, w: string) => `color-mix(in srgb, ${c} ${p}%, ${w})`;
  r.setProperty("--brand", brand);
  r.setProperty("--brand-ink", mix(brand, 78, "black"));
  r.setProperty("--brand-2", mix(brand, 55, "white"));
  r.setProperty("--brand-soft", mix(brand, 10, "white"));
  r.setProperty("--on-brand", luminance(brand) > 0.45 ? "#111111" : "#ffffff");
  r.setProperty("--side", side);
  r.setProperty("--side-2", mix(side, 82, "white"));
  r.setProperty("--bg", mix(brand, 3, "#f8f8f8"));
  r.setProperty("--line", mix(brand, 6, "#e6e6e6"));
  r.setProperty("--line-2", mix(brand, 4, "#f1f1f1"));
}

/** Applies the saved studio colours before first paint (no flash). */
export function ThemeScript() {
  const js = `try{var p=JSON.parse(localStorage.getItem("${KEY}")||"null");if(p){var r=document.documentElement.style,m=function(c,n,w){return"color-mix(in srgb, "+c+" "+n+"%, "+w+")"};var h=parseInt(p.brand.slice(1),16),l=[(h>>16)&255,(h>>8)&255,h&255].map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});var L=.2126*l[0]+.7152*l[1]+.0722*l[2];r.setProperty("--brand",p.brand);r.setProperty("--brand-ink",m(p.brand,78,"black"));r.setProperty("--brand-2",m(p.brand,55,"white"));r.setProperty("--brand-soft",m(p.brand,10,"white"));r.setProperty("--on-brand",L>.45?"#111111":"#ffffff");r.setProperty("--side",p.side);r.setProperty("--side-2",m(p.side,82,"white"));r.setProperty("--bg",m(p.brand,3,"#f8f8f8"));r.setProperty("--line",m(p.brand,6,"#e6e6e6"));r.setProperty("--line-2",m(p.brand,4,"#f1f1f1"))}}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [c, setC] = useState<Picked>(DEFAULT);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null") as Picked | null;
      // Restore the saved choice after mount (localStorage is browser-only).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setC(saved);
    } catch {}
  }, []);

  function update(next: Picked) {
    setC(next);
    apply(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  const sideTooLight = luminance(c.side) > 0.35;

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="no-print fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[0.88rem] font-medium shadow-2xl ring-1 ring-line hover:bg-line-2">
        <Palette size={16} /> Colours
      </button>
    );

  return (
    <div className="no-print pop fixed bottom-5 right-5 z-50 w-72 rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-line">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold"><Palette size={16} /> Pick your colours</span>
        <button className="btn-quiet h-7 min-w-7" onClick={() => setOpen(false)} aria-label="Close"><X size={15} /></button>
      </div>
      {([
        ["brand", "Brand colour", "Buttons, tabs, highlights"],
        ["side", "Sidebar colour", "Keep it dark"],
      ] as const).map(([k, label, hint]) => (
        <label key={k} className="mb-3 flex cursor-pointer items-center gap-3 rounded-xl p-2 ring-1 ring-line hover:bg-line-2">
          <input type="color" value={c[k]} onChange={(e) => update({ ...c, [k]: e.target.value })} className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
          <span className="flex-1">
            <span className="block text-[0.9rem] font-medium">{label}</span>
            <span className="block text-[0.78rem] text-faint">{hint}</span>
          </span>
          <span className="font-mono text-[0.78rem] uppercase text-muted">{c[k]}</span>
        </label>
      ))}
      {sideTooLight && <p className="mb-2 text-[0.78rem] text-mid">The sidebar text is white — pick a darker sidebar.</p>}
      <div className="flex gap-2">
        <button
          className="btn btn-primary btn-sm flex-1"
          onClick={async () => {
            await navigator.clipboard.writeText(`Brand ${c.brand.toUpperCase()} · Sidebar ${c.side.toUpperCase()}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy my colours"}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => { localStorage.removeItem(KEY); document.documentElement.removeAttribute("style"); setC(DEFAULT); }}>Reset</button>
      </div>
    </div>
  );
}
