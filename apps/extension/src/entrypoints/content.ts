export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // Detect .xmind file links on pages and inject preview buttons
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href$=".xmind"]');
      if (link) {
        const href = link.getAttribute('href');
        if (href) {
          // Could inject a preview button or send to side panel
          console.log('XMind file detected:', href);
        }
      }
    });
  },
});
