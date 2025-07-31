// Background script for MateMe Chat Sidebar
chrome.runtime.onInstalled.addListener(() => {
  console.log('MateMe Chat Sidebar extension installed');
});

// Enable the side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Auto-open sidepanel when extension is installed (optional)
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});