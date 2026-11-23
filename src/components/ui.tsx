import type { Status } from "@/lib/types";

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8">
      {eyebrow && <div className="text-xs uppercase tracking-wider text-accent font-semibold mb-2">{eyebrow}</div>}
      <h1 className="font-serif text-3xl leading-tight">{title}</h1>
      {children && <div className="mt-2 text-muted max-w-2xl">{children}</div>}
    </div>
  );
}

const STATUS_STYLE: Record<Status, string> = {
  saved: "bg-[#eef0f3] text-[#4a5361]",
  applied: "bg-[#e6eefa] text-[#2c5aa0]",
  interviewing: "bg-[#fbf0dc] text-[#9a6412]",
  offer: "bg-[#e3f1ee] text-[#0f6b62]",
  rejected: "bg-[#f8e8e6] text-[#a1402f]",
  withdrawn: "bg-[#f1efeb] text-[#7a756c]",
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card p-10 text-center">
      <div className="font-medium">{title}</div>
      {children && <div className="text-sm text-muted mt-2">{children}</div>}
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
