export default function Loading() {
  return (
    <div>
      <div className="skeleton mb-4 h-4 w-48" />
      <div className="grid items-start gap-5 xl:grid-cols-[270px_minmax(0,1fr)_300px]">
        <div className="skeleton h-[460px] rounded-2xl" />
        <div className="space-y-4">
          <div className="flex gap-1.5">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-9 w-24 rounded-full" />)}</div>
          <div className="skeleton h-72 rounded-2xl" />
          <div className="skeleton h-56 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-36 rounded-2xl" />
          <div className="skeleton h-60 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
