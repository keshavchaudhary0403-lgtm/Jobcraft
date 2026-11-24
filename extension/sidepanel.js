/* Jobcraft side panel: shows the job in the active tab and sends it to Jobcraft's Add job page. */
const TARGETS = { live: "https://jobcraft-sooty.vercel.app", local: "http://localhost:3000" };
const app = document.getElementById("app");
const refreshBtn = document.getElementById("refresh");
const targetSel = document.getElementById("target");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let current = { tabId: null, url: "", job: null };
let sentFor = "";

const ICON = {
  doc: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>',
  lock: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  check: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  arrow: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};

function siteIcon(site) {
  if (site === "LinkedIn") return '<span class="chip-ico ico-li">in</span>';
  if (site === "Naukri") return '<span class="chip-ico ico-nk">N</span>';
  return `<span class="chip-ico ico-web">${ICON.doc.replace(/24/g, "18")}</span>`;
}

function empty(icon, title, text, extra = "") {
  app.innerHTML = `<div class="card empty"><div class="big">${icon}</div><b>${esc(title)}</b><p>${text}</p>${extra}</div>`;
}

function loading() {
  app.innerHTML = `<div class="card"><div class="head"><span class="chip-ico ico-web"></span><div class="head-text"><div class="skel" style="width:60%"></div><div class="skel" style="width:40%;margin-top:6px"></div></div></div>
    <div class="fields"><div class="skel" style="height:42px"></div><div class="skel" style="height:42px"></div><div class="skel" style="height:42px"></div></div></div>`;
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
  if (Object.values(TARGETS).some((t) => url.startsWith(t))) {
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

  refreshBtn.classList.add("spin");
  loading();
  let job = null;
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: jobcraftExtract });
    job = res?.result || null;
  } catch {
    refreshBtn.classList.remove("spin");
    return empty(ICON.lock, "Can't read this page", "Chrome doesn't allow reading this page. Copy the description into Jobcraft instead.");
  }
  refreshBtn.classList.remove("spin");
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
    return empty(ICON.doc, "No job on this page", "Open a single job's page. Or highlight the job description, then press refresh above.", howTo());
  }
  const status = job.words >= 80 ? `<span class="pill ok">✓ Found</span>` : job.words >= 30 ? `<span class="pill warn">Short</span>` : `<span class="pill bad">No description</span>`;
  const how = job.how === "selection" ? `<div class="note good">Using the text you highlighted.</div>`
    : job.how === "guess" ? `<div class="note">Best guess for this site. For an exact copy, highlight the description and press refresh.</div>` : "";
  const sent = sentFor && sentFor === current.url;
  app.innerHTML = `
    <div class="card">
      <div class="head">${siteIcon(job.site)}<div class="head-text"><b>${esc(job.site)}</b><span>${esc(job.url.replace(/^https?:\/\/(www\.)?/, ""))}</span></div>${status}</div>
      <div class="fields">
        <div><label>Company<i>*</i></label><input class="field" id="company" value="${esc(job.company)}" placeholder="Company name" /></div>
        <div><label>Role<i>*</i></label><input class="field" id="role" value="${esc(job.role)}" placeholder="Job title" /></div>
        <div><label>Location</label><input class="field" id="location" value="${esc(job.location)}" placeholder="City (optional)" /></div>
      </div>
    </div>
    ${job.jd ? `<div class="card"><div class="desc-head"><b>Job description</b><span class="pill info">${job.words} words</span></div><div class="desc">${esc(job.jd)}</div></div>` : ""}
    ${how}
    ${job.words < 30 ? `<div class="note warn">Can't find the description? Highlight it on the page, then press refresh above.</div>` : ""}
    ${sent ? `<div class="note good">Sent. Check it in Jobcraft, then click Analyse job.</div>` : ""}
    <div class="actions">
      <button class="btn btn-clay" id="send" ${job.words < 30 ? "disabled" : ""}>${sent ? "Send again" : "Send to Jobcraft"} ${ICON.arrow}</button>
      <div class="sub">Opens Add job in Jobcraft - nothing is added until you confirm.</div>
    </div>`;
  document.getElementById("send").onclick = () => send(job);
}

const val = (id) => (document.getElementById(id)?.value || "").trim();

async function send(job) {
  const btn = document.getElementById("send");
  btn.disabled = true;
  btn.textContent = "Opening Jobcraft...";
  const payload = { site: job.site, url: job.url, company: val("company"), role: val("role"), location: val("location"), jd: job.jd };
  const url = `${TARGETS[targetSel.value]}/jobs/new`;
  const tab = await chrome.tabs.create({ url, active: false });
  // hide the panel on the Jobcraft tab before showing it, so Jobcraft opens at full width
  await chrome.sidePanel.setOptions({ tabId: tab.id, enabled: false }).catch(() => {});
  await chrome.tabs.update(tab.id, { active: true });
  sentFor = current.url;
  // When Jobcraft has loaded, hand it the job inside that tab only (sessionStorage), then nudge the page.
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
refreshBtn.onclick = () => read(true);

chrome.storage.local.get("target").then(({ target = "live" }) => { targetSel.value = target; });
targetSel.onchange = () => chrome.storage.local.set({ target: targetSel.value });
read(true);
