"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "./client-ui";

/** Round avatar: the profile photo when there is one, otherwise the initials. Used in the nav and on Profile. */
export function Avatar({ url, initials, size, className = "" }: { url?: string | null; initials: string; size: number; className?: string }) {
  if (url)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} className={`shrink-0 rounded-full object-cover ${className}`} style={{ width: size, height: size }} />;
  return (
    <span className={`avatar-warm grid shrink-0 place-items-center rounded-full font-bold ${className}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>
      {initials || "?"}
    </span>
  );
}

/** Centre-crop to a square and shrink to 400px, as a JPEG - small, fast to upload, and sharp at every avatar size. */
async function toSquareJpeg(file: File): Promise<Blob> {
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => fail(new Error("decode"));
      i.src = src;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const out = Math.min(400, side);
    const c = document.createElement("canvas");
    c.width = out;
    c.height = out;
    const g = c.getContext("2d")!;
    g.imageSmoothingQuality = "high";
    g.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, out, out);
    return await new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error("encode"))), "image/jpeg", 0.88));
  } finally {
    URL.revokeObjectURL(src);
  }
}

/**
 * Profile photo with a camera button: pick a photo (cropped to a square in the browser), or remove it.
 * The URL is saved to the user's auth metadata, then the session is refreshed so every page shows it at once.
 */
export function ProfilePhoto({ url: initialUrl, initials, size = 72, disabled = false, className = "" }: { url?: string | null; initials: string; size?: number; disabled?: boolean; className?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState(initialUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const pop = useRef<HTMLDivElement>(null);
  // Where the menu opens: fixed to the screen, so the banner (which clips) and the sticky tabs can't hide it.
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!menu) return;
    const r = box.current?.getBoundingClientRect();
    if (r) setAt({ top: r.bottom + 8, left: r.left });
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!box.current?.contains(t) && !pop.current?.contains(t)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    const off = () => setMenu(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", off, true);
    window.addEventListener("resize", off);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", off, true);
      window.removeEventListener("resize", off);
    };
  }, [menu]);

  async function remember(next: string | null) {
    const supabase = createClient();
    const { error: e } = await supabase.auth.updateUser({ data: { avatar_url: next } });
    if (e) throw e;
    await supabase.auth.refreshSession(); // new session token carries the photo, so the server sees it right away
    setUrl(next);
    router.refresh();
  }

  async function upload(file: File) {
    setError("");
    setBusy(true);
    try {
      let blob: Blob;
      try {
        blob = await toSquareJpeg(file);
      } catch {
        throw new Error("That photo couldn't be read. Try a JPG or PNG.");
      }
      const fd = new FormData();
      fd.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/profile/photo", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? "Couldn't save the photo. Try again.");
      await remember(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the photo. Try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setMenu(false);
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/profile/photo", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't remove the photo. Try again.");
      await remember(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove the photo. Try again.");
    } finally {
      setBusy(false);
    }
  }

  // The error note sits under the photo the same way; it goes away on scroll or after a few seconds.
  const [errAt, setErrAt] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!error) return;
    const r = box.current?.getBoundingClientRect();
    if (r) setErrAt({ top: r.bottom + 8, left: r.left });
    const off = () => setError("");
    const t = setTimeout(off, 6000);
    window.addEventListener("scroll", off, true);
    return () => { clearTimeout(t); window.removeEventListener("scroll", off, true); };
  }, [error]);

  const pick = () => { setMenu(false); input.current?.click(); };

  return (
    <div ref={box} className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <Avatar url={url} initials={initials} size={size} className="ring-4 ring-white/20" />
      {/* The whole photo is a button too (the camera badge alone is easy to miss): hover shows a camera + label. */}
      {!disabled && !busy && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => (url ? setMenu(!menu) : pick())}
          className={`group absolute inset-0 grid place-items-center rounded-full bg-transparent text-white transition ${url ? "hover:bg-black/45" : "hover:bg-side/90"}`}
        >
          <span className="flex flex-col items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
            <Camera size={18} />
            <span className="text-[0.62rem] font-semibold leading-none">{url ? "Change" : "Add photo"}</span>
          </span>
        </button>
      )}
      {busy && <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40 text-white"><Spinner size={18} /></span>}
      {!disabled && (
        <button
          type="button"
          onClick={() => (url ? setMenu(!menu) : pick())}
          disabled={busy}
          aria-label={url ? "Change or remove profile photo" : "Add profile photo"}
          aria-haspopup={url ? "menu" : undefined}
          aria-expanded={url ? menu : undefined}
          data-tip={url ? "Change photo" : "Add a photo"}
          className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-clay text-white shadow-md ring-2 ring-white transition hover:scale-105 disabled:opacity-60"
        >
          <Camera size={15} />
        </button>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {menu && at && createPortal(
        <div ref={pop} role="menu" style={{ top: at.top, left: at.left }} className="pop fixed z-[60] w-48 overflow-hidden rounded-2xl border border-line bg-card p-1.5 text-ink shadow-xl">
          <button role="menuitem" type="button" onClick={pick} className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[0.9rem] hover:bg-line-2"><ImagePlus size={16} className="text-muted" /> Change photo</button>
          <button role="menuitem" type="button" onClick={remove} className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[0.9rem] text-bad hover:bg-bad-soft"><Trash2 size={16} /> Remove photo</button>
        </div>,
        document.body,
      )}
      {error && errAt && createPortal(
        <p role="alert" style={{ top: errAt.top, left: errAt.left }} className="fixed z-[60] w-64 rounded-xl bg-bad-soft px-3 py-2 text-[0.8rem] font-medium text-bad shadow">{error}</p>,
        document.body,
      )}
    </div>
  );
}
