/** Shown instantly on navigation while the next page loads. */
export default function Loading() {
  return (
    <div className="animate-pulse-none">
      <div className="mb-6 space-y-2">
        <div className="skeleton h-7 w-56" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[76px] rounded-2xl" />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}
        </div>
        <div className="space-y-4">
          <div className="skeleton h-56 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
