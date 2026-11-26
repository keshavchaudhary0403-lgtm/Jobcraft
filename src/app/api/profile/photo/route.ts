import { createClient, createServiceClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/current-user";

/**
 * Profile photo. Stored in the public "avatars" bucket as <userId>/<random>.<ext> (one file per user - the old one is
 * removed on every change). The browser crops and shrinks the image first, then saves the returned URL to the
 * user's own auth metadata (avatar_url), so no database change is needed.
 */
const BUCKET = "avatars";
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
let ready = false;

async function bucket() {
  const s = createServiceClient();
  if (!ready) {
    const { data } = await s.storage.getBucket(BUCKET);
    if (!data) await s.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 2 * 1024 * 1024, allowedMimeTypes: Object.keys(TYPES) });
    ready = true;
  }
  return s.storage.from(BUCKET);
}

async function clear(b: Awaited<ReturnType<typeof bucket>>, userId: string) {
  const { data } = await b.list(userId);
  if (data?.length) await b.remove(data.map((f) => `${userId}/${f.name}`));
}

/** Who is asking, and are they allowed to change a photo (the shared demo account isn't). */
async function owner() {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) return { error: Response.json({ error: "Not logged in" }, { status: 401 }) };
  const { data: p } = await supabase.from("profiles").select("is_demo").eq("id", user.id).single<{ is_demo: boolean }>();
  if (p?.is_demo) return { error: Response.json({ error: "The demo account's photo can't be changed." }, { status: 403 }) };
  return { id: user.id };
}

export async function POST(req: Request) {
  const who = await owner();
  if (who.error) return who.error;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No photo received." }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return Response.json({ error: "Use a JPG, PNG or WebP photo." }, { status: 415 });
  if (file.size > 2 * 1024 * 1024) return Response.json({ error: "That photo is too large (max 2 MB)." }, { status: 413 });
  try {
    const b = await bucket();
    await clear(b, who.id);
    const path = `${who.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await b.upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: true });
    if (error) throw error;
    return Response.json({ url: b.getPublicUrl(path).data.publicUrl });
  } catch {
    return Response.json({ error: "Couldn't save the photo. Try again." }, { status: 500 });
  }
}

export async function DELETE() {
  const who = await owner();
  if (who.error) return who.error;
  try {
    await clear(await bucket(), who.id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Couldn't remove the photo. Try again." }, { status: 500 });
  }
}
