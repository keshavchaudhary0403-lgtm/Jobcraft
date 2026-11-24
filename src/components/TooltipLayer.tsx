"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * One app-styled tooltip for the whole app. Elements opt in with `data-tip` (SVG shapes may use a
 * <title> child). The bubble follows the cursor and is skipped when it would only repeat text that
 * is already fully visible on the element.
 */
export function TooltipLayer() {
  // x = centre of the hovered element; top/bottom = its edges (the bubble sits above, or below if no room)
  const [tip, setTip] = useState<{ text: string; x: number; top: number; bottom: number } | null>(null);
  const current = useRef<Element | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // Measure the bubble so it can be kept on screen and flipped below when there's no room above.
  useLayoutEffect(() => {
    if (box.current) setSize({ w: box.current.offsetWidth, h: box.current.offsetHeight });
  }, [tip?.text]);

  useEffect(() => {
    const textOf = (el: Element): string | null => {
      const d = el.getAttribute("data-tip");
      if (d) return d;
      const t = el.getAttribute("title"); // anything that still uses title (3rd-party or dynamic)
      if (t) {
        el.setAttribute("data-tip", t);
        el.removeAttribute("title");
        return t;
      }
      const svgTitle = Array.from(el.children).find((c) => c.tagName.toLowerCase() === "title");
      if (svgTitle?.textContent) {
        el.setAttribute("data-tip", svgTitle.textContent);
        svgTitle.remove();
        return svgTitle.textContent;
      }
      return null;
    };
    const redundant = (el: Element, text: string) => {
      const shown = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!shown || shown !== text.replace(/\s+/g, " ").trim()) return false;
      const h = el as HTMLElement;
      const clipped = h.scrollWidth > h.clientWidth + 1 || h.scrollHeight > h.clientHeight + 1;
      return !clipped; // same text, fully visible: no tooltip
    };
    const find = (start: EventTarget | null) => {
      let el = start instanceof Element ? start : null;
      while (el && el !== document.body) {
        const t = textOf(el);
        if (t) return redundant(el, t) ? null : { el, t };
        el = el.parentElement;
      }
      return null;
    };
    const place = (el: Element, text: string) => {
      const r = el.getBoundingClientRect();
      setTip((t) => (t && t.text === text && t.x === r.left + r.width / 2 && t.top === r.top ? t : { text, x: r.left + r.width / 2, top: r.top, bottom: r.bottom }));
    };
    const move = (e: MouseEvent) => {
      const hit = find(e.target);
      if (!hit) {
        if (current.current) { current.current = null; setTip(null); }
        return;
      }
      current.current = hit.el;
      place(hit.el, hit.t);
    };
    const hide = () => { current.current = null; setTip(null); };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseleave", hide);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("mousedown", hide);
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseleave", hide);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("mousedown", hide);
    };
  }, []);

  if (!tip) return null;
  const gap = 10;
  const below = tip.top - gap - (size.h || 40) < 8;
  const w = size.w || 160;
  // keep the bubble on screen, but point the arrow at the element's centre
  const left = Math.min(Math.max(tip.x - w / 2, 8), window.innerWidth - w - 8);
  const arrow = Math.min(Math.max(tip.x - left, 14), w - 14);
  return (
    <div
      ref={box}
      role="tooltip"
      className="pointer-events-none fixed z-[100] max-w-[260px] rounded-xl bg-side px-3 py-2 text-[0.8rem] font-medium leading-snug text-white shadow-[0_12px_28px_-10px_rgba(0,30,70,.55)]"
      style={{ left, top: below ? tip.bottom + gap : tip.top - gap, transform: below ? "none" : "translateY(-100%)", visibility: size.w ? "visible" : "hidden" }}
    >
      {tip.text}
      <span className={`absolute h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-side ${below ? "-top-1" : "-bottom-1"}`} style={{ left: arrow }} />
    </div>
  );
}
