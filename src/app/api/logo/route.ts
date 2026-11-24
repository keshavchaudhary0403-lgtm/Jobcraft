import { NextResponse } from "next/server";

// Proxies a company logo so the browser never calls a third-party logo service directly.
// Returns 404 when no real logo exists, so the UI falls back to the letter badge.
export async function GET(req: Request) {
  const d = new URL(req.url).searchParams.get("d")?.toLowerCase() ?? "";
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) || d.length > 80) return new NextResponse(null, { status: 400 });
  try {
    const r = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128`, { next: { revalidate: 60 * 60 * 24 * 7 } });
    const type = r.headers.get("content-type") ?? "";
    if (!r.ok || !type.startsWith("image/")) return new NextResponse(null, { status: 404 });
    const buf = await r.arrayBuffer();
    if (buf.byteLength < 200) return new NextResponse(null, { status: 404 });
    return new NextResponse(buf, { headers: { "content-type": type, "cache-control": "public, max-age=604800, immutable" } });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
