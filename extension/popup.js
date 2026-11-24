const TARGETS = { live: "https://jobcraft-sooty.vercel.app", local: "http://localhost:3000" };
const app = document.getElementById("app");
const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function main() {
  const { target = "live" } = await chrome.storage.local.get("target");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https?:/.test(tab.url || "")) return render(null, target, "Open a job page first (LinkedIn, Naukri or a company careers page).");
  let job = null;
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: jobcraftExtract });
    job = res?.result || null;
  } catch (e) {
    return render(null, target, "Chrome doesn't allow reading this page.");
  }
  render(job, target);
}

function render(job, target, error) {
  const status = !job ? "" :
    job.words >= 80 ? `<span class="chip ok">✓ Description found · ${job.words} words</span>` :
    job.words >= 30 ? `<span class="chip warn">Short description · ${job.words} words</span>` :
    `<span class="chip bad">No description found</span>`;
  const how = job?.how === "selection" ? "Using the text you highlighted." : job?.how === "guess" ? "Best guess for this site - highlight the description for an exact copy." : "";
  app.innerHTML = `
    ${error ? `<div class="card"><span class="chip bad">${esc(error)}</span></div>` : `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px"><b>${esc(job.site)}</b>${status}</div>
      <div class="row"><label>Company</label><input id="company" value="${esc(job.company)}" placeholder="Company" /></div>
      <div class="row"><label>Role</label><input id="role" value="${esc(job.role)}" placeholder="Role" /></div>
      <div class="row"><label>Location</label><input id="location" value="${esc(job.location)}" placeholder="Optional" /></div>
      ${job.jd ? `<div class="jd">${esc(job.jd.slice(0, 600))}</div>` : ""}
    </div>
    ${how ? `<div class="hint">${esc(how)}</div>` : ""}
    ${job.words < 30 ? `<div class="hint">Can't find the description? Highlight it on the page, then open this again.</div>` : ""}
    <button class="send" id="send" ${job.words < 30 ? "disabled" : ""}>Send to Jobcraft</button>`}
    <div class="foot">
      <span class="muted">Sends to</span>
      <select id="target"><option value="live">jobcraft-sooty.vercel.app</option><option value="local">localhost:3000 (testing)</option></select>
    </div>`;
  const sel = document.getElementById("target");
  sel.value = target;
  sel.onchange = () => chrome.storage.local.set({ target: sel.value });
  const btn = document.getElementById("send");
  if (btn) btn.onclick = () => send({ ...job, company: val("company"), role: val("role"), location: val("location") }, sel.value);
}
const val = (id) => (document.getElementById(id)?.value || "").trim();

async function send(job, target) {
  const btn = document.getElementById("send");
  btn.disabled = true;
  btn.textContent = "Opening Jobcraft...";
  const payload = { site: job.site, url: job.url, company: job.company, role: job.role, location: job.location, jd: job.jd };
  const tab = await chrome.tabs.create({ url: `${TARGETS[target]}/jobs/new` });
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
    });
  };
  chrome.tabs.onUpdated.addListener(listener);
}

main();
