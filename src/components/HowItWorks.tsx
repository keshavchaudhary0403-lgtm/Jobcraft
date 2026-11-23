/** A short horizontal "how it plays out" flow: numbered stops joined by a line. */
export function HowItWorks({ steps, title = "How a round works" }: { steps: string[]; title?: string }) {
  return (
    <div>
      <div className="mb-3 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-muted">{title}</div>
      <ol className="grid gap-4" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => (
          <li key={s} className="relative">
            {i < steps.length - 1 && <span className="absolute left-10 -right-2 top-4 h-[2px] bg-line" />}
            <span className="relative z-10 grid h-8 w-8 place-items-center rounded-full bg-side font-display text-[0.85rem] font-bold text-cream">{i + 1}</span>
            <p className="mt-2 text-[0.86rem] leading-snug text-ink/80">{s}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
