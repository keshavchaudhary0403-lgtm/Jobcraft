/**
 * Dark "how it works" panel beside the job picker (Interview + Salary). It matches the picker card's height
 * (the picker list has a fixed height); the steps stay evenly spaced and centred, so the panel never looks
 * stretched if the picker grows (e.g. "Another role" opens its fields). The tip sits at the bottom.
 */
export function HowItWorks({ title, steps, tip }: { title: string; steps: string[]; tip: string }) {
  return (
    <section className="dark-card flex h-full flex-col p-6">
      <h2 className="text-[1.2rem] font-bold leading-none text-white">{title}</h2>
      {/* Vertical timeline: each step gets an equal share of the space between title and tip, and a connector
          runs from its number down to the next one - so the rhythm is even at any card height. */}
      <ol className="my-7 flex flex-1 flex-col justify-center">
        {steps.map((t, i) => {
          const last = i === steps.length - 1;
          return (
            <li key={t} className={`relative flex gap-4 ${last ? "" : "min-h-[3.75rem] max-h-[6rem] flex-1"}`}>
              {!last && <span aria-hidden className="absolute bottom-1 left-[17px] top-11 w-[2px] rounded-full bg-white/25" />}
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white font-display text-[0.95rem] font-bold text-side shadow-[0_0_0_4px_rgba(255,255,255,.12)]">{i + 1}</span>
              <span className="pt-[0.45rem] text-[0.98rem] font-medium leading-snug text-white">{t}</span>
            </li>
          );
        })}
      </ol>
      <p className="rounded-2xl bg-white/[.12] px-4 py-3 text-[0.92rem] leading-snug text-white ring-1 ring-inset ring-white/15">{tip}</p>
    </section>
  );
}
