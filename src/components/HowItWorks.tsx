export function HowItWorks({ steps }: { steps: string[] }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-faint">How it works</div>
      <ol className="mt-3 space-y-3">
        {steps.map((s, i) => (
          <li key={s} className="flex items-start gap-3 text-sm">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-ink">{i + 1}</span>
            <span className="pt-0.5 text-slate-700">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
