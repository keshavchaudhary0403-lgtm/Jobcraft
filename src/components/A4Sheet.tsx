"use client";

import { useEffect, useRef, useState } from "react";
import { LAYOUT, PAGE_ROOM, resumeCss } from "./ResumeDoc";

const A4 = LAYOUT;
/** Where page 1's printable area ends, measured from the top of the sheet. */
const BREAK_AT = A4.h - A4.margin;
/** The resume's type on screen = the PDF's type. */
const SheetStyle = () => <style dangerouslySetInnerHTML={{ __html: resumeCss(".a4-sheet", true) }} />;

/**
 * A true-size A4 page (same width, margins and type as the PDF), scaled down to fit its column.
 * A dashed line marks where page 1 ends; anything below it goes to page 2.
 */
export function A4Sheet({ children, over }: { children: React.ReactNode; over: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [h, setH] = useState(0);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (wrap.current) setScale(Math.min(1, wrap.current.clientWidth / (A4.w * 96)));
      if (sheet.current) setH(sheet.current.offsetHeight);
    });
    if (wrap.current) ro.observe(wrap.current);
    if (sheet.current) ro.observe(sheet.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrap} className="relative w-full overflow-x-clip" style={{ height: h ? h * scale : undefined }}>
      <SheetStyle />
      <div ref={sheet} className="a4-sheet" style={{ width: `${A4.w}in`, padding: `${A4.margin}in`, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {over && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 bg-bad-soft/70" style={{ top: `${BREAK_AT}in` }} />}
        <div className="relative">{children}</div>
        <div aria-hidden className={`a4-break ${over ? "is-over" : ""}`} style={{ top: `${BREAK_AT}in` }}>
          <span>{over ? "Page 1 ends - everything below spills onto page 2" : "Page 1 ends here"}</span>
        </div>
      </div>
    </div>
  );
}

const ROOM_1 = PAGE_ROOM;
const ROOM_N = PAGE_ROOM;

/**
 * The resume as real A4 pages, broken at whole lines like the PDF.
 * `children` is the rendered resume; it is laid out once (invisible) to find where each page ends,
 * then each page shows its slice.
 */
export function A4Pages({ children }: { children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const flow = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [cuts, setCuts] = useState<number[]>([0]); // where each page starts, px from the top of the content

  useEffect(() => {
    const paginate = () => {
      if (wrap.current) setScale(Math.min(1, wrap.current.clientWidth / (A4.w * 96)));
      const root = flow.current;
      if (!root) return;
      const top = root.getBoundingClientRect().top;
      const k = root.getBoundingClientRect().height / (root.offsetHeight || 1); // undo the visual scale
      const blocks = Array.from(root.querySelectorAll("h1,h2,h3,p,li")).map((el) => {
        const r = el.getBoundingClientRect();
        return { t: (r.top - top) / k, b: (r.bottom - top) / k };
      });
      const starts = [0];
      let start = 0;
      for (const bl of blocks) {
        const room = starts.length === 1 ? ROOM_1 : ROOM_N;
        if (bl.b - start > room - 1 && bl.t > start) {
          start = bl.t;
          starts.push(start);
        }
      }
      setCuts((prev) => (prev.join() === starts.join() ? prev : starts));
    };
    paginate();
    const ro = new ResizeObserver(paginate);
    if (wrap.current) ro.observe(wrap.current);
    if (flow.current) ro.observe(flow.current);
    return () => ro.disconnect();
  }, [children]);

  const pageH = A4.h * 96;
  return (
    <div ref={wrap} className="relative w-full">
      <SheetStyle />
      {/* invisible full-length copy, used only to find the page breaks */}
      <div aria-hidden className="pointer-events-none absolute left-0 top-0 h-0 overflow-hidden opacity-0">
        <div className="a4-sheet !min-h-0" style={{ width: `${A4.w}in`, padding: `0 ${A4.margin}in` }}>
          <div ref={flow}>{children}</div>
        </div>
      </div>

      <div className="space-y-4">
        {cuts.map((start, i) => {
          const room = i === 0 ? ROOM_1 : ROOM_N;
          const end = cuts[i + 1] ?? Infinity;
          const padTop = A4.margin * 96;
          return (
            <div key={i} className="overflow-x-clip" style={{ height: pageH * scale }}>
              <div
                className={`a4-sheet !min-h-0 !p-0 overflow-hidden ${i > 0 ? "ring-2 ring-bad/40" : ""}`}
                style={{ width: `${A4.w}in`, height: pageH, transform: `scale(${scale})`, transformOrigin: "top left" }}
              >
                {i > 0 && <span className="absolute right-4 top-3 z-10 rounded-full bg-bad px-2.5 py-0.5 font-sans text-[9pt] font-semibold text-white">Page {i + 1} - trim to fit one page</span>}
                <div className="absolute overflow-hidden" style={{ top: padTop, left: `${A4.margin}in`, right: `${A4.margin}in`, height: Math.min(room, end - start) }}>
                  <div style={{ transform: `translateY(${-start}px)` }}>{children}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
