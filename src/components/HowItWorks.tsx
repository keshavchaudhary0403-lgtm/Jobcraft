/**
 * Dark "how it works" panel beside the job picker (Interview + Salary).
 * Steps are spread over the panel's full height (it matches the picker card), joined by a line,
 * with bright text - no empty band at the bottom.
 */
export function HowItWorks({ title, steps, tip }: { title: string; steps: string[]; tip: string }) {
  return (
    <section className="dark-card flex flex-col p-6 sm:p-7">
      <h2 className="text-[1.2rem] font-bold leading-none text-white">{title}</h2>
      <ol className="relative mt-5 flex flex-1 flex-col justify-between gap-4">
        {/* the line that joins the numbers */}
        <span aria-hidden className="absolute bottom-5 left-[17px] top-5 w-[2px] rounded-full bg-white/20" />
        {steps.map((t, i) => (
          <li key={t} className="relative flex items-center gap-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white font-display text-[0.95rem] font-bold text-side shadow-[0_0_0_4px_rgba(255,255,255,.12)]">{i + 1}</span>
            <span className="text-[1.02rem] font-medium leading-snug text-white">{t}</span>
          </li>
        ))}
      </ol>
      <p className="mt-6 rounded-2xl bg-white/[.12] px-4 py-3 text-[0.92rem] leading-snug text-white ring-1 ring-inset ring-white/15">{tip}</p>
    </section>
  );
}
