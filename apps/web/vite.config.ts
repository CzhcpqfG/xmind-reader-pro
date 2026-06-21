import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// GitHub Pages 部署在项目子路径下；本地开发保持根路径
const repository = process.env.GITHUB_REPOSITORY || '';
const base = repository ? `/${repository.split('/')[1]}/` : '/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@xmind-reader/core': resolve(__dirname, '../../packages/core/src/index.ts'),
      '@xmind-reader/renderer': resolve(__dirname, '../../packages/renderer/src/index.ts'),
      '@xmind-reader/exporter': resolve(__dirname, '../../packages/exporter/src/index.ts'),
      '@xmind-reader/ui-components': resolve(__dirname, '../../packages/ui-components/src/index.ts'),
    },
    dedupe: ['react', 'react-dom', 'zustand'],
  },
  server: {
    port: 5173,
    open: true,
  },
});
