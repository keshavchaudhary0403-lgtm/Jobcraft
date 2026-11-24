// Clicking the toolbar icon opens the Jobcraft side panel (it stays open while you browse).
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// On Jobcraft's own tabs the panel steps aside, so Jobcraft gets the full width (its desktop layout).
// On every other tab it's available as usual.
const JOBCRAFT = ["https://jobcraft-sooty.vercel.app", "http://localhost:3000"];
const isJobcraft = (url = "") => JOBCRAFT.some((j) => url.startsWith(j));

async function fit(tabId, url) {
  if (!url) return;
  await chrome.sidePanel.setOptions(isJobcraft(url) ? { tabId, enabled: false } : { tabId, path: "sidepanel.html", enabled: true }).catch(() => {});
}

chrome.tabs.onUpdated.addListener((tabId, info, tab) => { if (info.url || info.status === "loading") fit(tabId, info.url || tab.url); });
chrome.tabs.onActivated.addListener(async ({ tabId }) => { const t = await chrome.tabs.get(tabId).catch(() => null); if (t) fit(tabId, t.url); });
chrome.runtime.onInstalled.addListener(async () => {
  for (const t of await chrome.tabs.query({})) fit(t.id, t.url);
});
