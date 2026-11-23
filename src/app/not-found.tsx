import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center p-6">
      <div className="card max-w-md p-8 text-center">
        <div className="text-[20px] font-semibold">Page not found</div>
        <p className="mt-2 text-muted">It may have been deleted, or the link is wrong.</p>
        <Link className="btn btn-primary mt-5" href="/">Go home</Link>
      </div>
    </main>
  );
}
