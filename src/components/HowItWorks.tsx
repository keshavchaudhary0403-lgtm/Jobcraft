export function HowItWorks({ steps }: { steps: string[] }) {
  return (
    <div className="card p-5">
      <div className="eyebrow">How it works</div>
      <ol className="mt-3 space-y-2.5">
        {steps.map((s, i) => (
          <li key={s} className="flex items-start gap-3">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.72rem] font-semibold text-brand-ink">{i + 1}</span>
            <span className="text-slate-700">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
