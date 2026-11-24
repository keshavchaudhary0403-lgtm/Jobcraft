import { createServiceClient } from "@/lib/supabase/server";

/**
 * The user's uploaded resume PDF, kept privately so they can see exactly which file their profile came from.
 * Layout in the private "resumes" bucket:  <userId>/pending/<file>.pdf  (uploaded, not saved yet)
 *                                          <userId>/current/<file>.pdf  (the one their profile uses)
 * Only the server (service role) touches the bucket; users open their own file through a short signed link.
 */
const BUCKET = "resumes";
let ready = false;

async function bucket() {
  const s = createServiceClient();
  if (!ready) {
    const { data } = await s.storage.getBucket(BUCKET);
    if (!data) await s.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 8 * 1024 * 1024, allowedMimeTypes: ["application/pdf"] });
    ready = true;
  }
  return s.storage.from(BUCKET);
}

const safeName = (n: string) => (n.replace(/\.pdf$/i, "").replace(/[^\p{L}\p{N}._ -]+/gu, "").trim().slice(0, 80) || "resume") + ".pdf";

async function clear(b: Awaited<ReturnType<typeof bucket>>, dir: string) {
  const { data } = await b.list(dir);
  if (data?.length) await b.remove(data.map((f) => `${dir}/${f.name}`));
}

/** Keep the just-uploaded PDF until the user saves their profile. */
export async function savePending(userId: string, name: string, bytes: Uint8Array) {
  const b = await bucket();
  await clear(b, `${userId}/pending`);
  const { error } = await b.upload(`${userId}/pending/${safeName(name)}`, bytes, { contentType: "application/pdf", upsert: true });
  if (error) throw error;
}

/** On save: the pending PDF becomes the current one (the old one is removed). */
export async function keepPending(userId: string) {
  const b = await bucket();
  const { data } = await b.list(`${userId}/pending`);
  const f = data?.[0];
  if (!f) return false;
  await clear(b, `${userId}/current`);
  const { error } = await b.move(`${userId}/pending/${f.name}`, `${userId}/current/${f.name}`);
  if (error) throw error;
  return true;
}

/** The current uploaded PDF: its name and when it was uploaded. */
export async function currentFile(userId: string): Promise<{ name: string; uploadedAt: string; path: string } | null> {
  const b = await bucket();
  const { data } = await b.list(`${userId}/current`);
  const f = data?.find((x) => x.name.toLowerCase().endsWith(".pdf"));
  if (!f) return null;
  return { name: f.name, uploadedAt: f.created_at ?? f.updated_at ?? "", path: `${userId}/current/${f.name}` };
}

/** A link to open the current PDF, valid for 2 minutes. */
export async function currentFileUrl(userId: string) {
  const f = await currentFile(userId);
  if (!f) return null;
  const b = await bucket();
  const { data } = await b.createSignedUrl(f.path, 120);
  return data?.signedUrl ?? null;
}
