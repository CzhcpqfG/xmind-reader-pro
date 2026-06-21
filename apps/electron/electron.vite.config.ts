import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

const root = resolve(__dirname, '../..');

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
      lib: {
        entry: resolve(__dirname, 'src/main/index.ts'),
        formats: ['es'],
        fileName: () => 'index.js',
      },
      rollupOptions: {
        output: {
          entryFileNames: 'index.js',
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      lib: {
        entry: resolve(__dirname, 'src/preload/index.ts'),
        formats: ['cjs'],
        fileName: () => 'index.js',
      },
      rollupOptions: {
        output: {
          entryFileNames: 'index.js',
        },
      },
    },
  },
  renderer: {
    plugins: [react()],
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        // 指向源码，Vite 会即时编译
        '@xmind-reader/core': resolve(root, 'packages/core/src/index.ts'),
        '@xmind-reader/renderer': resolve(root, 'packages/renderer/src/index.ts'),
        '@xmind-reader/exporter': resolve(root, 'packages/exporter/src/index.ts'),
        '@xmind-reader/ui-components': resolve(root, 'packages/ui-components/src/index.ts'),
      },
      dedupe: ['react', 'react-dom', 'zustand'],
    },
    build: {
      outDir: resolve(__dirname, 'dist/renderer'),
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') },
      },
    },
  },
});
