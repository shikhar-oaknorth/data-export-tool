document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('export');
  btn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (tab?.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content.js']
      });
    }
    window.close();
  });
});
