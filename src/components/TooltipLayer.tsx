"use client";

import { useEffect, useRef, useState } from "react";

/**
 * App-styled tooltips for the whole app. Any element with a `title` attribute (or an SVG
 * shape with a <title> child) shows this bubble instead of the browser's plain tooltip.
 */
export function TooltipLayer() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; below: boolean } | null>(null);
  const current = useRef<Element | null>(null);

  useEffect(() => {
    const textOf = (el: Element): string | null => {
      const t = el.getAttribute("title");
      if (t) {
        el.setAttribute("data-tip", t);
        el.removeAttribute("title");
        return t;
      }
      const d = el.getAttribute("data-tip");
      if (d) return d;
      const svgTitle = Array.from(el.children).find((c) => c.tagName.toLowerCase() === "title");
      if (svgTitle?.textContent) {
        el.setAttribute("data-tip", svgTitle.textContent);
        svgTitle.remove();
        return el.getAttribute("data-tip");
      }
      return null;
    };
    const find = (start: EventTarget | null) => {
      let el = start instanceof Element ? start : null;
      while (el && el !== document.body) {
        const t = textOf(el);
        if (t) return { el, t };
        el = el.parentElement;
      }
      return null;
    };
    const over = (e: MouseEvent) => {
      const hit = find(e.target);
      if (!hit) return;
      if (hit.el === current.current) return;
      current.current = hit.el;
      const r = hit.el.getBoundingClientRect();
      const below = r.top < 60;
      setTip({ text: hit.t, x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below });
    };
    const out = (e: MouseEvent) => {
      if (current.current && e.relatedTarget instanceof Node && current.current.contains(e.relatedTarget)) return;
      current.current = null;
      setTip(null);
    };
    const hide = () => { current.current = null; setTip(null); };
    document.addEventListener("mouseover", over);
    document.addEventListener("mouseout", out);
    window.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mouseout", out);
      window.removeEventListener("scroll", hide, true);
    };
  }, []);

  if (!tip) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[100] max-w-[260px] rounded-xl bg-[#0b2f5c] px-3 py-2 text-[0.8rem] font-medium leading-snug text-white shadow-[0_12px_28px_-10px_rgba(0,30,70,.55)] ring-1 ring-white/10"
      style={{ left: tip.x, top: tip.y, transform: `translate(-50%, ${tip.below ? "0" : "-100%"})` }}
    >
      {tip.text}
    </div>
  );
}
