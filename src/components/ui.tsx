import type { Status } from "@/lib/types";

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 fade-up">
      <div>
        <h1 className="text-[1.6rem] font-semibold leading-tight tracking-tight">{title}</h1>
        {sub && <p className="mt-0.5 text-muted">{sub}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export const STATUS_META: Record<Status, { label: string; cls: string; dot: string }> = {
  saved: { label: "Saved", cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  applied: { label: "Applied", cls: "bg-info-soft text-info", dot: "bg-blue-500" },
  interviewing: { label: "Interviewing", cls: "bg-mid-soft text-mid", dot: "bg-amber-500" },
  offer: { label: "Offer", cls: "bg-good-soft text-good", dot: "bg-green-600" },
  rejected: { label: "Rejected", cls: "bg-bad-soft text-bad", dot: "bg-orange-600" },
  withdrawn: { label: "Withdrawn", cls: "bg-slate-100 text-slate-500", dot: "bg-slate-300" },
};

export function StatusPill({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span className={`chip ${m.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function scoreColor(score: number) {
  return score >= 7 ? "#15803d" : score >= 5 ? "#b45309" : "#c2410c";
}

export function MatchChip({ score }: { score: number }) {
  const cls = score >= 7 ? "bg-good-soft text-good" : score >= 5 ? "bg-mid-soft text-mid" : "bg-bad-soft text-bad";
  return <span className={`chip ${cls}`}>{score * 10}% match</span>;
}

/** Animated ring, score out of 10. */
export function ScoreRing({ score, size = 104, stroke = 9, label = true }: { score: number; size?: number; stroke?: number; label?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e9eeec" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 10)}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      {label && (
        <div className="absolute text-center leading-none">
          <span className="font-semibold tracking-tight" style={{ fontSize: size * 0.3, color }}>{score}</span>
          <span className="text-faint" style={{ fontSize: size * 0.13 }}>/10</span>
        </div>
      )}
    </div>
  );
}

// Soft tinted monograms (like app icons) — never loud solid blocks.
const AVATAR_HUES = [262, 222, 199, 168, 142, 32, 12, 330];
export function CompanyAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const h = AVATAR_HUES[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_HUES.length];
  return (
    <div
      className="grid shrink-0 place-items-center font-bold"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        fontSize: size * 0.42,
        background: `linear-gradient(145deg, hsl(${h} 90% 96%), hsl(${h} 80% 90%))`,
        color: `hsl(${h} 60% 38%)`,
        boxShadow: `inset 0 0 0 1px hsl(${h} 70% 86%)`,
      }}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </div>
  );
}

const TONES = { sky: "bg-sky text-blue-700", sun: "bg-sun text-amber-800", lilac: "bg-lilac text-violet-700", rose: "bg-rose text-rose-700", mint: "bg-good-soft text-good" };
export function StatTile({ icon, label, value, sub, tone = "sky" }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; tone?: keyof typeof TONES }) {
  return (
    <div className="card card-hover flex items-center gap-3.5 p-4">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${TONES[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[0.82rem] text-muted">{label}</div>
        <div className="text-[1.45rem] font-semibold leading-tight tracking-tight tabular-nums">{value}</div>
        {sub && <div className="truncate text-[0.78rem] text-faint">{sub}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon, title, sub, action }: { icon?: React.ReactNode; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center fade-up">
      {icon && <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand-ink">{icon}</div>}
      <div className="font-semibold">{title}</div>
      {sub && <div className="mt-1 max-w-sm text-muted">{sub}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** 0–100: how complete the candidate file is. */
export function profileStrength(p: { master_resume: string | null; target_role: string | null; strongest_proof: string | null; skills: string[] | null; current_ctc: string | null; linkedin_url: string | null; city: string | null }) {
  const checks = [
    [!!p.master_resume && p.master_resume.length > 300, 40],
    [!!p.target_role, 15],
    [!!p.strongest_proof, 15],
    [(p.skills?.length ?? 0) >= 5, 10],
    [!!p.city, 5],
    [!!p.current_ctc, 8],
    [!!p.linkedin_url, 7],
  ] as const;
  return checks.reduce((t, [ok, w]) => t + (ok ? w : 0), 0);
}
