"use client";

import { useEffect, useRef, useState } from "react";
import { companyDomain } from "@/lib/company-domain";
import { CompanyAvatar } from "./CompanyAvatar";

const CLIENT_ID = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID;

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
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // A logo that already failed before the page became interactive never fires onError - catch it here.
  useEffect(() => {
    const i = img.current;
    if (i && i.complete && i.naturalWidth === 0) setFailed(true);
  }, []);

  if (CLIENT_ID && site && !failed)
    return (
      <span className={`flex min-w-0 items-center ${className}`} style={{ height: Math.max(height, iconSize) }} data-tip={name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={img}
          src={`https://cdn.brandfetch.io/domain/${site}/h/${height * 3}/theme/dark/fallback/404/logo?c=${CLIENT_ID}`}
          alt={name}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          onError={() => setFailed(true)}
          className="block w-auto max-w-full object-contain object-left"
          style={{ height, maxWidth: height * 7 }}
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
