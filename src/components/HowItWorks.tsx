import { ListChecks } from "lucide-react";

export function HowItWorks({ steps }: { steps: string[] }) {
  return (
    <div className="card p-5">
      <div className="card-head"><span className="ico"><ListChecks size={15} /></span>How it works</div>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s} className="flex items-start gap-3">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[12px] font-semibold text-brand-ink">{i + 1}</span>
            <span className="text-slate-700">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
