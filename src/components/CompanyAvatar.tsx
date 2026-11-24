"use client";

import { useState } from "react";
import { companyDomain } from "@/lib/company-domain";

const AVATAR_TONES = [
  ["var(--brand-soft)", "var(--brand-ink)"],
  ["#e4f1fc", "#1f6fb8"],
  ["#eceffc", "#4a5fd0"],
  ["var(--good-soft)", "var(--good)"],
];

/** Company logo (real one when we can find it), falling back to a letter badge. */
export function CompanyAvatar({ name, size = 36, jobUrl }: { name: string; size?: number; jobUrl?: string | null }) {
  const domain = companyDomain(name, jobUrl);
  const [failed, setFailed] = useState(false);
  const [bgTone, fgTone] = AVATAR_TONES[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_TONES.length];
  const radius = Math.round(size * 0.28);
  if (domain && !failed)
    return (
      <span className="grid shrink-0 place-items-center overflow-hidden bg-white ring-1 ring-line" style={{ width: size, height: size, borderRadius: radius }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/logo?d=${domain}`} alt={`${name} logo`} width={Math.round(size * 0.66)} height={Math.round(size * 0.66)} loading="lazy" onError={() => setFailed(true)} className="object-contain" />
      </span>
    );
  return (
    <span className="grid shrink-0 place-items-center font-bold" style={{ width: size, height: size, borderRadius: radius, fontSize: size * 0.42, background: bgTone, color: fgTone }}>
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
