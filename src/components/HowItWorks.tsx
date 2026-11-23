/** "How it works" as a horizontal strip of numbered steps (stacks on small screens). */
export function HowItWorks({ steps }: { steps: string[] }) {
  return (
    <ol className="card grid overflow-hidden fade-up sm:grid-flow-col sm:auto-cols-fr sm:divide-x sm:divide-line">
      {steps.map((s, i) => (
        <li key={s} className="flex items-start gap-3 border-b border-line px-5 py-4 last:border-b-0 sm:border-b-0">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.75rem] font-semibold text-brand-ink">{i + 1}</span>
          <span className="text-[0.9rem] leading-snug text-slate-700">{s}</span>
        </li>
      ))}
    </ol>
  );
}
