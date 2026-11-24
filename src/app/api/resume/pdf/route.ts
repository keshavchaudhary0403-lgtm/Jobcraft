import fs from "fs";
import path from "path";
import { currentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { pdfHtml, resumeFileName } from "@/lib/resume-pdf";
import type { Application } from "@/lib/types";
import type { ResumeResult } from "@/lib/tasks";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Builds the tailored resume as a real PDF file (headless Chrome), so the download never depends on the
 * browser's print dialog: links stay clickable, no header/footer, same A4 margins and page breaks as the
 * on-screen check. Arial is embedded as Arimo (identical letter widths) so lines break the same everywhere.
 */
const FONT_DIR = path.join(process.cwd(), "node_modules/@fontsource/arimo/files");
const LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const LATIN_EXT = "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";
let fontCss: string | null = null;
function fonts() {
  if (fontCss) return fontCss;
  const face = (weight: number, subset: string, range: string) => {
    const b64 = fs.readFileSync(path.join(FONT_DIR, `arimo-${subset}-${weight}-normal.woff2`)).toString("base64");
    return `@font-face{font-family:Arial;font-style:normal;font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format("woff2");unicode-range:${range}}`;
  };
  fontCss = [400, 700].flatMap((w) => [face(w, "latin", LATIN), face(w, "latin-ext", LATIN_EXT)]).join("\n");
  return fontCss;
}

async function browser() {
  const puppeteer = (await import("puppeteer-core")).default;
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
  }
  const local = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  return puppeteer.launch({ executablePath: local, headless: true });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

  const { applicationId, html: body } = (await req.json().catch(() => ({}))) as { applicationId?: string; html?: string };
  if (typeof body !== "string" || !body.trim() || body.length > 300_000) return Response.json({ error: "Nothing to print" }, { status: 400 });
  const { data: app } = await supabase.from("applications").select("id, company, tailored_resume, resume_result").eq("id", applicationId ?? "").single<Pick<Application, "id" | "company" | "tailored_resume" | "resume_result">>();
  if (!app) return Response.json({ error: "Job not found" }, { status: 404 });
  const md = app.tailored_resume ?? (app.resume_result as ResumeResult | null)?.resume_markdown ?? "";
  if (!md.trim()) return Response.json({ error: "No resume yet" }, { status: 400 });

  const file = resumeFileName(md, app.company);
  // The resume exactly as drawn on screen (rendered from the saved markdown). Strip anything that isn't
  // plain document markup before it reaches the browser; scripts are also off and network is blocked below.
  const clean = body
    .replace(/<(script|style|iframe|object|embed|link|meta|base|form|svg|math|img|video|audio|source)\b[\s\S]*?(<\/\1>|\/?>)/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href\s*=\s*["'])\s*(javascript|data|file|vbscript):/gi, "$1#");
  const html = pdfHtml(file, clean, fonts());

  const b = await browser();
  try {
    const page = await b.newPage();
    await page.setJavaScriptEnabled(false);
    // Nothing leaves the server: only the embedded fonts (data: URLs) may load.
    await page.setRequestInterception(true);
    page.on("request", (r) => (r.url().startsWith("data:") ? r.continue() : r.abort()));
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false, tagged: true });
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${file}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("resume pdf", e);
    return Response.json({ error: "Couldn't build the PDF" }, { status: 500 });
  } finally {
    await b.close();
  }
}
