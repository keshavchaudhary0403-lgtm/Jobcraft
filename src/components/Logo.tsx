export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="jc-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0d9488" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#jc-g)" />
      <path d="M38 18v18.5a9.5 9.5 0 0 1-19 0" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M46 12.5l1.9 4.6 4.6 1.9-4.6 1.9-1.9 4.6-1.9-4.6-4.6-1.9 4.6-1.9z" fill="#a7f3d0" />
    </svg>
  );
}

export function Logo({ size = 30, light = false }: { size?: number; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className={`text-[1.15rem] font-semibold tracking-tight ${light ? "text-white" : "text-ink"}`}>Jobcraft</span>
    </span>
  );
}
