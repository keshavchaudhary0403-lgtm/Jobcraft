/*
 * The panel belongs to the tab you open it on (not the whole window):
 * click the Jobcraft icon on a job tab -> the panel opens for that tab and follows the jobs you open in it.
 * Other tabs - including the Jobcraft tab that "Send" opens - have no panel, so they keep their full width.
 */
const JOBCRAFT = ["https://jobcraft-sooty.vercel.app", "http://localhost:3000"];
const isJobcraft = (url = "") => JOBCRAFT.some((j) => url.startsWith(j));

async function setup() {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  await chrome.sidePanel.setOptions({ enabled: false }).catch(() => {}); // no window-wide panel
}
chrome.runtime.onInstalled.addListener(setup);
chrome.runtime.onStartup.addListener(setup);

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id || isJobcraft(tab.url)) return;
  // must stay synchronous with the click so Chrome allows opening the panel
  chrome.sidePanel.setOptions({ tabId: tab.id, path: "sidepanel.html", enabled: true });
  chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
});

// If a tab with the panel is navigated to Jobcraft, the panel steps aside there.
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.url && isJobcraft(info.url)) chrome.sidePanel.setOptions({ tabId, enabled: false }).catch(() => {});
});
