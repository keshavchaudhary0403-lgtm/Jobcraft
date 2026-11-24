"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * One app-styled tooltip for the whole app. Elements opt in with `data-tip` (SVG shapes may use a
 * <title> child). The bubble follows the cursor and is skipped when it would only repeat text that
 * is already fully visible on the element.
 */
export function TooltipLayer() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const current = useRef<Element | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  // Measure the bubble so a tall one flips below the cursor instead of running off the top of the window.
  useLayoutEffect(() => {
    if (box.current) setH(box.current.offsetHeight);
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
    const place = (e: MouseEvent, text: string) => {
      const x = Math.min(Math.max(e.clientX, 140), window.innerWidth - 140);
      setTip({ text, x, y: e.clientY });
    };
    const move = (e: MouseEvent) => {
      const hit = find(e.target);
      if (!hit) {
        if (current.current) { current.current = null; setTip(null); }
        return;
      }
      current.current = hit.el;
      place(e, hit.t);
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
  const below = tip.y - 14 - (h || 40) < 8;
  return (
    <div
      ref={box}
      role="tooltip"
      className="pointer-events-none fixed z-[100] max-w-[260px] rounded-xl bg-side px-3 py-2 text-[0.8rem] font-medium leading-snug text-white shadow-[0_12px_28px_-10px_rgba(0,30,70,.55)]"
      style={{ left: tip.x, top: below ? tip.y + 22 : tip.y - 14, transform: `translate(-50%, ${below ? "0" : "-100%"})` }}
    >
      {tip.text}
      <span className={`absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-side ${below ? "-top-1" : "-bottom-1"}`} />
    </div>
  );
}
