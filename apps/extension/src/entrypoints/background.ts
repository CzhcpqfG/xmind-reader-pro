export default defineBackground(() => {
  // Handle .xmind file downloads - offer to open in reader
  chrome.downloads?.onDeterminingFilename?.addListener((downloadItem, suggest) => {
    if (downloadItem.filename.endsWith('.xmind')) {
      // Could show a notification or auto-open
    }
    suggest({ filename: downloadItem.filename });
  });

  // Side panel behavior
  chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true });
});
