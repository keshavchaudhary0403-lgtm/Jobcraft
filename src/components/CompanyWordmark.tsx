"use client";

import { useEffect, useRef, useState } from "react";
import { companyDomain } from "@/lib/company-domain";
import { CompanyAvatar } from "./CompanyAvatar";

const CLIENT_ID = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID;

/** What a logo really occupies: its size, the box around its visible pixels, and how much of that box it fills. */
type Shape = { w: number; h: number; x0: number; y0: number; bw: number; bh: number; ink: number };
const shapes = new Map<string, Shape | null>();

/** Measure a logo's visible box and ink (once per image). Null if the browser can't read its pixels. */
function measure(src: string): Promise<Shape | null> {
  if (shapes.has(src)) return Promise.resolve(shapes.get(src)!);
  return new Promise((done) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = im.naturalWidth;
        c.height = im.naturalHeight;
        const g = c.getContext("2d", { willReadFrequently: true })!;
        g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1, ink = 0;
        for (let y = 0; y < c.height; y++)
          for (let x = 0; x < c.width; x++)
            if (d[(y * c.width + x) * 4 + 3] > 40) {
              ink++;
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
            }
        const shape = x1 < 0 ? null : { w: c.width, h: c.height, x0, y0, bw: x1 - x0 + 1, bh: y1 - y0 + 1, ink: ink / ((x1 - x0 + 1) * (y1 - y0 + 1)) };
        shapes.set(src, shape);
        done(shape);
      } catch {
        shapes.set(src, null);
        done(null);
      }
    };
    im.onerror = () => done(null);
    im.src = src;
  });
}

/**
 * Size a logo by how heavy it looks, not just its height: same "visual weight" for every brand.
 * Wide or dense marks (KROLL, SITA) come out smaller, light or compact ones (cult.fit, EY) larger,
 * all within the same max height and width.
 */
function fit(shape: Shape, maxH: number) {
  const r = shape.bw / shape.bh;
  const base = maxH * 0.9; // a typical 3:1 logo of normal density lands here
  const area = 3 * base * base * Math.sqrt(0.35);
  let h = Math.sqrt(area / (r * Math.sqrt(Math.max(shape.ink, 0.12))));
  h = Math.min(maxH, Math.max(maxH * 0.55, h));
  let w = r * h;
  const maxW = maxH * 4;
  if (w > maxW) { w = maxW; h = w / r; }
  return { w: Math.round(w), h: Math.round(h), scale: h / shape.bh };
}

/**
 * The company's own wordmark (horizontal logo) from Brandfetch's Logo API.
 * Brandfetch requires the image to load straight from their CDN in the browser (no proxy, no caching),
 * and needs a free client ID. Without one - or when they have no logo - it shows the icon + the name.
 */
export function CompanyWordmark({
  name,
  jobUrl,
  height = 26,
  iconSize = 32,
  nameClass = "truncate text-[0.95rem] font-bold text-ink",
  className = "",
  domain,
  logo,
}: {
  name: string;
  jobUrl?: string | null;
  /** Wordmark height in px. */
  height?: number;
  /** Fallback icon size in px. */
  iconSize?: number;
  nameClass?: string;
  className?: string;
  /** The job's saved company website (best source of the official wordmark). */
  domain?: string | null;
  /** Logo saved from the job page (LinkedIn/Naukri) - used when there's no wordmark. */
  logo?: string | null;
}) {
  // Saved website first; with a saved logo but no website, don't guess (a guess can be another company);
  // otherwise fall back to guessing from the link / name.
  const site = domain || (logo ? null : companyDomain(name, jobUrl));
  // Remember which website failed, so a new website (e.g. added in Edit) gets a fresh try.
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const failed = !!site && failedFor === site;
  const setFailed = () => setFailedFor(site);
  const img = useRef<HTMLImageElement>(null);
  // Fallback balance (if pixels can't be read): wide wordmarks a bit shorter, compact ones full height.
  const [ratio, setRatio] = useState<number | null>(null);
  const drawH = ratio ? Math.round(Math.min(height, Math.max(height * 0.6, height * Math.sqrt(2.6 / ratio)))) : height;
  const src = site && CLIENT_ID ? `https://cdn.brandfetch.io/domain/${site}/h/${height * 3}/theme/dark/fallback/404/logo?c=${CLIENT_ID}` : "";
  const [shape, setShape] = useState<Shape | null>(src ? shapes.get(src) ?? null : null);
  useEffect(() => {
    if (!src) return;
    let live = true;
    measure(src).then((m) => live && setShape(m));
    return () => { live = false; };
  }, [src]);
  // A logo that already failed before the page became interactive never fires onError - catch it here.
  useEffect(() => {
    const i = img.current;
    if (i && i.complete && i.naturalWidth === 0) setFailedFor(site);
    // already loaded before React attached onLoad (cached image) - measure it now
    else if (i && i.complete && i.naturalHeight) setRatio(i.naturalWidth / i.naturalHeight);
  }, [site]);

  if (CLIENT_ID && site && !failed && shape) {
    // Trimmed of empty margins and sized by visual weight: a fixed window onto the hot-linked logo.
    const f = fit(shape, height);
    return (
      <span className={`flex min-w-0 items-center ${className}`} style={{ height: Math.max(height, iconSize) }}>
        <span className="relative block shrink-0 overflow-hidden" style={{ width: f.w, height: f.h }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={name}
            referrerPolicy="strict-origin-when-cross-origin"
            onError={setFailed}
            className="absolute max-w-none"
            style={{ width: shape.w * f.scale, height: shape.h * f.scale, left: -shape.x0 * f.scale, top: -shape.y0 * f.scale }}
          />
        </span>
      </span>
    );
  }

  if (CLIENT_ID && site && !failed)
    return (
      <span className={`flex min-w-0 items-center ${className}`} style={{ height: Math.max(height, iconSize) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={img}
          src={src}
          alt={name}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          onError={setFailed}
          onLoad={(e) => { const i = e.currentTarget; if (i.naturalWidth && i.naturalHeight) setRatio(i.naturalWidth / i.naturalHeight); }}
          className="block w-auto max-w-full object-contain object-left"
          style={{ height: drawH, maxWidth: height * 4.2 }}
        />
      </span>
    );

  return (
    <span className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="shrink-0 rounded-[10px] border border-line bg-white object-contain p-0.5" style={{ width: iconSize, height: iconSize }} />
      ) : (
        <CompanyAvatar name={name} jobUrl={jobUrl} size={iconSize} />
      )}
      <span className={nameClass}>{name}</span>
    </span>
  );
}
