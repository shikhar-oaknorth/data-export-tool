// background.js (MV3 service-worker style)
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['src/content.js']
  });
});
