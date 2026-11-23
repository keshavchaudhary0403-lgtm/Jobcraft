import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/current-user";
import { overLimit } from "@/lib/rate-limit";

/** Sites that block automated reading — the user pastes the description instead. */
const BLOCKED = /(^|\.)(linkedin\.com|naukri\.com|indeed\.(com|co\.in)|glassdoor\.(com|co\.in))$/i;

function privateIp(ip: string) {
  if (isIP(ip) === 6) {
    const x = ip.toLowerCase();
    if (x.startsWith("::ffff:")) return privateIp(x.slice(7));
    return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

/** Only public http(s) hosts — never internal addresses (SSRF protection). */
async function safeUrl(raw: string): Promise<URL | string> {
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return "That doesn't look like a link.";
  }
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) return "Only normal web links work.";
  if (u.port && !["80", "443"].includes(u.port)) return "Only normal web links work.";
  if (BLOCKED.test(u.hostname)) return `${u.hostname.replace(/^www\./, "")} doesn't let apps read its job pages — copy the description and paste it below.`;
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(u.hostname)) return "That link isn't reachable.";
  try {
    const addrs = await lookup(u.hostname, { all: true });
    if (!addrs.length || addrs.some((a) => privateIp(a.address))) return "That link isn't reachable.";
  } catch {
    return "Couldn't find that website.";
  }
  return u;
}

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

function htmlToText(html: string) {
  return decode(
    html
      .replace(/<(script|style|noscript|svg|nav|header|footer|form|iframe)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|section|article|tr)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n\n")
    .trim();
}

type Posting = { title?: string; description?: string; hiringOrganization?: { name?: string }; jobLocation?: { address?: { addressLocality?: string; addressRegion?: string } } | { address?: { addressLocality?: string } }[] };

function findPosting(html: string): Posting | null {
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1].trim());
      const items = (Array.isArray(data) ? data : data["@graph"] ?? [data]) as { "@type"?: string | string[] }[];
      const job = items.find((x) => [x["@type"]].flat().includes("JobPosting"));
      if (job) return job as Posting;
    } catch {}
  }
  return null;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) return Response.json({ error: "Please log in again." }, { status: 401 });
  if (await overLimit(`jobfetch:${user.id}`, 20, 600)) return Response.json({ error: "Too many links in a short time — wait a few minutes." }, { status: 429 });
  const { url } = (await req.json()) as { url?: string };
  if (!url?.trim()) return Response.json({ error: "Paste a link first." }, { status: 400 });

  let target = await safeUrl(url.trim());
  if (typeof target === "string") return Response.json({ error: target }, { status: 400 });

  let html = "";
  try {
    for (let hop = 0; hop < 4; hop++) {
      const res = await fetch(target, {
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; JobcraftBot/1.0)", Accept: "text/html" },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        const next = await safeUrl(new URL(res.headers.get("location")!, target).toString());
        if (typeof next === "string") return Response.json({ error: next }, { status: 400 });
        target = next;
        continue;
      }
      if (!res.ok) return Response.json({ error: `The page answered with an error (${res.status}). Paste the description instead.` }, { status: 400 });
      if (!(res.headers.get("content-type") ?? "").includes("html")) return Response.json({ error: "That link isn't a web page." }, { status: 400 });
      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let size = 0;
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2_000_000) break;
        html += dec.decode(value, { stream: true });
      }
      break;
    }
  } catch {
    return Response.json({ error: "Couldn't open that page. Paste the description instead." }, { status: 400 });
  }

  const posting = findPosting(html);
  const loc = Array.isArray(posting?.jobLocation) ? posting?.jobLocation[0]?.address : (posting?.jobLocation as { address?: { addressLocality?: string } } | undefined)?.address;
  let jd = posting?.description ? htmlToText(posting.description) : "";
  if (jd.split(/\s+/).length < 60) {
    const body = html.match(/<(main|article)[\s\S]*?<\/\1>/i)?.[0] ?? html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html;
    jd = htmlToText(body);
  }
  jd = jd.slice(0, 15000);
  if (jd.split(/\s+/).length < 60) return Response.json({ error: "Couldn't find a job description on that page. Paste it instead." }, { status: 400 });

  return Response.json({
    jd: posting?.title && !jd.startsWith(posting.title) ? `${posting.title}\n\n${jd}` : jd,
    company: posting?.hiringOrganization?.name ?? null,
    role: posting?.title ?? null,
    location: loc?.addressLocality ?? null,
    url: target.toString(),
  });
}
