import type { Status } from "@/lib/types";

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 fade-up">
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-[0.95rem] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export const STATUS_META: Record<Status, { label: string; cls: string; dot: string }> = {
  saved: { label: "Saved", cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  applied: { label: "Applied", cls: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  interviewing: { label: "Interviewing", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  offer: { label: "Offer", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", cls: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
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
  return score >= 7 ? "#059669" : score >= 5 ? "#d97706" : "#dc2626";
}

/** Animated circular score out of 10. */
export function ScoreRing({ score, size = 112, stroke = 10, label = true }: { score: number; size?: number; stroke?: number; label?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#eef1f5" strokeWidth={stroke} fill="none" />
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
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.2,.7,.2,1)", animation: "ring-in 1.1s cubic-bezier(.2,.7,.2,1) both" }}
        />
      </svg>
      {label && (
        <div className="absolute text-center leading-none">
          <span className="font-semibold tracking-tight" style={{ fontSize: size * 0.3, color }}>{score}</span>
          <span className="text-faint" style={{ fontSize: size * 0.13 }}>/10</span>
        </div>
      )}
      <style>{`@keyframes ring-in { from { stroke-dashoffset: ${c}; } }`}</style>
    </div>
  );
}

export function CompanyAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const hues = [172, 199, 221, 250, 160, 30, 340];
  const h = hues[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % hues.length];
  return (
    <div
      className="grid shrink-0 place-items-center rounded-xl font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${h} 70% 95%)`, color: `hsl(${h} 55% 32%)` }}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </div>
  );
}

export function Empty({ icon, title, sub, action }: { icon?: React.ReactNode; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center fade-up">
      {icon && <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">{icon}</div>}
      <div className="font-medium">{title}</div>
      {sub && <div className="mt-1 max-w-sm text-sm text-muted">{sub}</div>}
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
