import { useId } from "react";

export function LogoMark({ size = 28, inverse = false }: { size?: number; inverse?: boolean }) {
  const id = useId(); // unique gradient id — shared ids break when one copy is hidden
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--brand-2)" }} />
          <stop offset="1" style={{ stopColor: "var(--brand)" }} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={inverse ? "#ffffff" : `url(#${id})`} />
      <path d="M38 18v18.5a9.5 9.5 0 0 1-19 0" fill="none" stroke={inverse ? "var(--brand)" : "#fff"} strokeWidth="6.5" strokeLinecap="round" />
      <path d="M46 12.5l1.9 4.6 4.6 1.9-4.6 1.9-1.9 4.6-1.9-4.6-4.6-1.9 4.6-1.9z" fill={inverse ? "var(--brand-2)" : "#ffffff"} opacity={inverse ? 1 : 0.85} />
    </svg>
  );
}

export function Logo({ size = 28, light = false }: { size?: number; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} inverse={light} />
      <span className={`text-[1.15rem] font-semibold tracking-tight ${light ? "text-white" : "text-ink"}`}>Jobcraft</span>
    </span>
  );
}
