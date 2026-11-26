/* Jobcraft side panel: shows the job in the active tab and sends it to Jobcraft's Add job page. */
/** Where jobs are sent. (For local testing, change this to "http://localhost:3000".) */
const BASE = "https://jobcraft-sooty.vercel.app";
const app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let current = { tabId: null, url: "", job: null };

const ICON = {
  doc: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>',
  lock: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  check: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  tick: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
  ext: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>',
  refresh: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg>',
  person: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};

function siteIcon(site) {
  if (site === "LinkedIn") return '<span class="chip-ico ico-li">in</span>';
  if (site === "Naukri") return '<span class="chip-ico ico-nk">N</span>';
  return `<span class="chip-ico ico-web">${ICON.doc.replace(/24/g, "18")}</span>`;
}

/** The recheck button: reads the page again. Sits next to the main button at the bottom. */
const recheck = (label = "Recheck") => `<button class="btn btn-soft2" id="refresh" title="Read this page again">${ICON.refresh}<span>${label}</span></button>`;
const recheckIcon = () => `<button class="btn btn-soft2 btn-square" id="refresh" title="Read this page again" aria-label="Read this page again">${ICON.refresh}</button>`;
const spin = (on) => document.getElementById("refresh")?.classList.toggle("spin", on);
function wireRecheck() {
  const b = document.getElementById("refresh");
  if (b) b.onclick = () => read(true);
}

function empty(icon, title, text, extra = "") {
  app.innerHTML = `<div class="card empty"><div class="big">${icon}</div><b>${esc(title)}</b><p>${text}</p>${extra}</div><div class="actions"><div class="row one">${recheck("Read this page again")}</div></div>`;
  wireRecheck();
}

function loading() {
  app.innerHTML = `<div class="card"><div class="head"><span class="chip-ico ico-web"></span><div class="head-text"><div class="skel" style="width:60%"></div><div class="skel" style="width:40%;margin-top:6px"></div></div></div>
    <div class="fields"><div class="skel" style="height:42px"></div><div class="skel" style="height:42px"></div><div class="skel" style="height:42px"></div></div></div>
    <div class="actions"><div class="row">${recheck()}<div class="skel" style="height:44px;border-radius:999px"></div></div></div>`;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
}

async function read(force = false) {
  const tab = await activeTab();
  if (!tab) return;
  const url = tab.url || "";
  if (!force && current.tabId === tab.id && current.url === url && current.job) return;
  current = { tabId: tab.id, url, job: null };

  if (!/^https?:/.test(url)) {
    return empty(ICON.doc, "Open a job to send it", "Go to a job on LinkedIn, Naukri or a company careers page.", howTo());
  }
  const origin = new URL(url).origin;
  if ([BASE, "http://localhost:3000"].some((t) => url.startsWith(t))) {
    return empty(ICON.check, "You're in Jobcraft", "Switch to a job tab (LinkedIn, Naukri or a careers page) and it shows up here.");
  }
  const allowed = await chrome.permissions.contains({ origins: [origin + "/*"] });
  if (!allowed) {
    const host = new URL(url).hostname.replace(/^www\./, "");
    empty(ICON.lock, `Read jobs on ${host}?`, "Jobcraft reads a job page only to send it to you. Allow once for this site.",
      `<button class="btn btn-soft" id="allow" style="margin-top:14px">Allow on ${esc(host)}</button>`);
    document.getElementById("allow").onclick = async () => {
      const ok = await chrome.permissions.request({ origins: [origin + "/*"] });
      if (ok) read(true);
    };
    return;
  }

  loading();
  spin(true);
  let job = null;
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: jobcraftExtract });
    job = res?.result || null;
  } catch {
    return empty(ICON.lock, "Can't read this page", "Chrome doesn't allow reading this page. Copy the description into Jobcraft instead.");
  }
  // ignore results from a tab the user already left
  const now = await activeTab();
  if (!now || now.id !== tab.id || now.url !== url) return;
  current.job = job;
  render(job);
}

function howTo() {
  return `<ol class="steps"><li><span>1</span>Open a job on LinkedIn or Naukri</li><li><span>2</span>Check the details here</li><li><span>3</span>Send it - then click Analyse job in Jobcraft</li></ol>`;
}

function render(job) {
  if (!job || (!job.jd && !job.role)) {
    return empty(ICON.doc, "No job on this page", "Open a single job's page. Or highlight the job description, then press recheck below.", howTo());
  }
  const status = job.words >= 80 ? `<span class="pill ok">✓ Found</span>` : job.words >= 30 ? `<span class="pill warn">Short</span>` : `<span class="pill bad">No description</span>`;
  const how = job.how === "selection" ? `<div class="note good">Using the text you highlighted.</div>`
    : job.how === "guess" ? `<div class="note">Best guess for this site. For an exact copy, highlight the description and press recheck.</div>` : "";
  // Only when the post names its hiring team (LinkedIn "Meet the hiring team") - saved with the job.
  const team = (job.contacts || []).length
    ? `<div class="card"><div class="desc-head"><b>Hiring team</b><span class="pill info">Saved with the job</span></div><div class="people">${job.contacts
        .map((c) => `<a class="person" href="${esc(c.url)}" target="_blank" rel="noreferrer"><span class="person-ico">${ICON.person}</span><span class="person-text"><b>${esc(c.name)}</b>${c.title ? `<span>${esc(c.title)}</span>` : ""}</span>${ICON.ext}</a>`)
        .join("")}</div></div>`
    : "";
  app.innerHTML = `
    <div class="card">
      <div class="head">${job.logoUrl ? `<img class="co-logo" src="${esc(job.logoUrl)}" alt="" />` : siteIcon(job.site)}<div class="head-text"><b>${esc(job.site)}</b><span>${esc(job.url.replace(/^https?:\/\/(www\.)?/, ""))}</span></div>${status}</div>
      <div class="fields">
        <div><label>Company<i>*</i></label><input class="field" id="company" value="${esc(job.company)}" placeholder="Company name" /></div>
        <div><label>Role<i>*</i></label><input class="field" id="role" value="${esc(job.role)}" placeholder="Job title" /></div>
        <div><label>Location</label><input class="field" id="location" value="${esc(job.location)}" placeholder="City (optional)" /></div>
      </div>
    </div>
    ${team}
    ${job.jd ? `<div class="card"><div class="desc-head"><b>Job description</b><span class="pill info">${job.words} words</span></div><div class="desc">${esc(job.jd)}</div></div>` : ""}
    ${how}
    ${job.words < 30 ? `<div class="note warn">Can't find the description? Highlight it on the page, then press recheck below.</div>` : ""}
    <div class="actions" id="actions"></div>`;
  renderActions(job);
  if (!known.has(current.url)) checkSaved(job);
}

/*
 * Whether this job is already in Jobcraft, remembered per job link:
 *   { kind: "saved" (just now) | "exists" (found by the check / a duplicate), id, by: "link" | "name", analysed }
 * Shown in the pinned bottom bar, right above the button - no scrolling needed.
 */
const known = new Map();

function renderActions(job) {
  const box = document.getElementById("actions");
  if (!box) return;
  const r = known.get(current.url);
  const base = BASE;
  const when = r?.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
  const openBtn = (label) => r?.id ? `<a class="btn btn-primary" target="_blank" href="${base}/jobs/${esc(r.id)}">${label} ${ICON.ext}</a>` : "";
  const strip = (tone, icon, title, sub) => `<div class="strip ${tone}"><span class="strip-ico">${icon}</span><div><b>${title}</b><span>${sub}</span></div></div>`;
  let html;
  if (r?.kind === "saved") {
    html = strip("good", ICON.tick, "Saved to Jobcraft", "No AI has run - analyse it when you're ready.") + `<div class="row">${recheck()}${openBtn("Open in Jobcraft")}</div>`;
  } else if (r?.kind === "exists" && r.by === "link") {
    html = strip("info", ICON.tick, "Already in your Jobcraft", `${when ? `Saved ${when} · ` : ""}${r.analysed ? "analysed" : "not analysed yet"}`) + `<div class="row">${recheck()}${openBtn("Open in Jobcraft")}</div>`;
  } else if (r?.kind === "exists") {
    html = strip("warn", ICON.copy, "Similar job already saved", `${esc(r.role)} at ${esc(r.company)}${r.location ? ` in ${esc(r.location)}` : ""} - same company, role${r.location ? " and city" : ""}.`) +
      `<div class="row three">${recheckIcon()}${openBtn("Open saved job")}<button class="btn btn-outline" id="send" data-force="1">Save anyway</button></div>`;
  } else {
    html = `<div class="row">${recheck()}<button class="btn btn-clay" id="send" ${job.words < 30 ? "disabled" : ""}>Save job ${ICON.arrow}</button></div>`;
  }
  box.innerHTML = html;
  wireRecheck();
  const b = document.getElementById("send");
  if (b) b.onclick = () => save(job, b.dataset.force === "1");
}

/** Ask Jobcraft whether this job is already saved (read-only). Quietly does nothing if it can't tell. */
async function checkSaved(job) {
  const url = current.url;
  try {
    const res = await fetch(`${BASE}/api/jobs/check`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: job.url, company: job.company, role: job.role, location: job.location }) });
    if (!res.ok) return;
    const { match } = await res.json();
    if (match) known.set(url, { kind: "exists", ...match });
    if (current.url === url && current.job) renderActions(current.job);
  } catch {}
}

const val = (id) => (document.getElementById(id)?.value || "").trim();

/** Save straight into Jobcraft (with the duplicate check). Falls back to opening Add job if that isn't possible. */
async function save(job, force) {
  const btn = document.getElementById("send");
  btn.disabled = true;
  btn.textContent = "Saving...";
  const logo = await logoData(job.logoUrl);
  const payload = { site: job.site, url: job.url, company: val("company"), role: val("role"), location: val("location"), jd: job.jd, website: job.website || "", logo, contacts: job.contacts || [] };
  const base = BASE;
  try {
    const res = await fetch(`${base}/api/jobs/save`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, force }) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 409 && data.duplicate) {
      known.set(current.url, { kind: "exists", ...data.duplicate });
    } else if (res.ok && data.id) {
      known.set(current.url, { kind: "saved", id: data.id, by: "link" });
    } else if (res.status === 400) {
      btn.disabled = false;
      btn.innerHTML = `Save job ${ICON.arrow}`;
      document.getElementById("actions").insertAdjacentHTML("afterbegin", `<div class="note warn">${esc(data.error || "Check the details.")}</div>`);
      return;
    } else {
      return openAddJob(payload); // not logged in here, or something else - finish in Jobcraft
    }
  } catch {
    return openAddJob(payload);
  }
  renderActions(job);
}

/** The company logo the job page showed, as a small PNG (max 128px) - Jobcraft keeps its own copy. */
async function logoData(src) {
  if (!src) return "";
  try {
    const blob = await (await fetch(src)).blob();
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, 128 / Math.max(bmp.width, bmp.height));
    const c = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const out = await c.convertToBlob({ type: "image/png" });
    return await new Promise((r) => { const f = new FileReader(); f.onload = () => r(String(f.result)); f.readAsDataURL(out); });
  } catch {
    return "";
  }
}

/** Fallback: open Jobcraft's Add job page, filled in, to save it there. */
async function openAddJob(payload) {
  const tab = await chrome.tabs.create({ url: `${BASE}/jobs/new` });
  const listener = async (id, info) => {
    if (id !== tab.id || info.status !== "complete") return;
    chrome.tabs.onUpdated.removeListener(listener);
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [JSON.stringify(payload)],
      func: (data) => {
        sessionStorage.setItem("jobcraft-import", data);
        window.dispatchEvent(new Event("jobcraft-import"));
      },
    }).catch(() => {});
  };
  chrome.tabs.onUpdated.addListener(listener);
}

// Follow the user: re-read when they switch tabs or open another job (LinkedIn changes the URL without reloading).
let timer = null;
const later = (ms = 900) => { clearTimeout(timer); timer = setTimeout(() => read(), ms); };
chrome.tabs.onActivated.addListener(() => later(150));
chrome.tabs.onUpdated.addListener((id, info, tab) => {
  if (!tab.active) return;
  if (info.url) later(1200);
  else if (info.status === "complete") later(600);
});
chrome.windows.onFocusChanged.addListener(() => later(200));

read(true);
