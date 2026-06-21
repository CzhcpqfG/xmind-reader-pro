import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'XMind Reader',
    description: 'Read and view .xmind mind map files in your browser',
    version: '0.1.0',
    permissions: ['storage', 'sidePanel', 'activeTab'],
    side_panel: {
      default_path: 'sidepanel.html',
    },
    action: {
      default_popup: 'popup.html',
      default_icon: {
        '16': 'icon/16.png',
        '32': 'icon/32.png',
        '48': 'icon/48.png',
        '128': 'icon/128.png',
      },
    },
  },
  srcDir: 'src',
});
