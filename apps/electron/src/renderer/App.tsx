import React, { useEffect, useCallback, useRef, useState } from 'react';
import { parseXMind, findNodeById } from '@xmind-reader/core';
import { MindMapRenderer, DEFAULT_THEME, DARK_THEME } from '@xmind-reader/renderer';
import { useMindMapStore, setZoomCallbacks, setExportMarkdownCallback } from '@xmind-reader/ui-components';
import { exportToMarkdown } from '@xmind-reader/exporter';
import { SearchBar } from '@xmind-reader/ui-components';
import { NotePanel } from '@xmind-reader/ui-components';
import { Toolbar } from '@xmind-reader/ui-components';
import { SheetTabs } from '@xmind-reader/ui-components';
import { ImageLightbox } from '@xmind-reader/ui-components';

declare global {
  interface Window {
    electronAPI?: {
      openFileDialog: () => Promise<{ filePath: string; buffer: ArrayBuffer } | null>;
      readFile: (path: string) => Promise<ArrayBuffer>;
      saveExport: (options: any) => Promise<boolean>;
      onFileOpened: (callback: (data: { filePath: string; buffer: ArrayBuffer }) => void) => () => void;
      onFileError: (callback: (data: { message: string }) => void) => () => void;
    };
  }
}

// MindMapViewer 组件
const MindMapViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MindMapRenderer | null>(null);
  const data = useMindMapStore((s) => s.data);
  const activeSheetIndex = useMindMapStore((s) => s.activeSheetIndex);
  const theme = useMindMapStore((s) => s.theme);
  const searchResults = useMindMapStore((s) => s.searchResults);
  const setScale = useMindMapStore((s) => s.setScale);
  const openLightbox = useMindMapStore((s) => s.openLightbox);

  useEffect(() => {
    if (!containerRef.current) return;
    const renderer = new MindMapRenderer({
      container: containerRef.current,
      onNodeClick: (node) => useMindMapStore.getState().selectNode(node.id),
      onNodeHover: (node) => useMindMapStore.getState().hoverNode(node?.id ?? null),
      onCollapseToggle: (nodeId) => useMindMapStore.getState().toggleCollapse(nodeId),
      onZoomChange: (scale) => setScale(scale),
      onImageClick: (image) => openLightbox(image),
    });
    rendererRef.current = renderer;

    // 绑定缩放回调到 Toolbar
    setZoomCallbacks({
      zoomIn: () => renderer.zoomIn(),
      zoomOut: () => renderer.zoomOut(),
      fitToView: () => renderer.fitToView(),
    });

    // 绑定导出 Markdown 回调
    setExportMarkdownCallback(() => {
      const store = useMindMapStore.getState();
      if (!store.data) return;
      const md = exportToMarkdown(store.data);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'xmind-export.md';
      a.click();
      URL.revokeObjectURL(url);
    });

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !data || !data.sheets[activeSheetIndex]) return;

    const sheet = data.sheets[activeSheetIndex];
    try {
      renderer.setData(
        sheet.rootTopic,
        sheet.structureClass,
        sheet.theme,
        sheet.summaries || [],
        sheet.boundaries || [],
        sheet.relationships || []
      );
    } catch (err) {
      console.error('Layout/render failed:', err);
    }
  }, [data, activeSheetIndex]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.updateTheme(theme === 'dark' ? DARK_THEME : DEFAULT_THEME);
  }, [theme]);

  // 搜索高亮联动
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    if (searchResults.length > 0) {
      renderer.highlightNodes(searchResults.map(r => r.nodeId));
    } else {
      renderer.clearHighlight();
    }
  }, [searchResults]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
  );
};

export const App: React.FC = () => {
  const data = useMindMapStore((s) => s.data);
  const setData = useMindMapStore((s) => s.setData);
  const theme = useMindMapStore((s) => s.theme);
  const isNotePanelOpen = useMindMapStore((s) => s.isNotePanelOpen);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBuffer = useCallback(async (buffer: ArrayBuffer) => {
    setLoading(true);
    setError(null);
    try {
      const parsed = await parseXMind(buffer);
      setData(parsed);
    } catch (err) {
      setError(`解析文件失败: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [setData]);

  const handleOpenFile = useCallback(async () => {
    if (!window.electronAPI) {
      setError('Electron API 不可用');
      return;
    }
    try {
      const result = await window.electronAPI.openFileDialog();
      if (result && result.buffer) {
        await handleBuffer(result.buffer);
      }
    } catch (err) {
      setError(`打开文件失败: ${(err as Error).message}`);
    }
  }, [handleBuffer]);

  const handleFileDrop = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    await handleBuffer(buffer);
  }, [handleBuffer]);

  useEffect(() => {
    if (window.electronAPI) {
      const unsubOpened = window.electronAPI.onFileOpened(async ({ buffer }) => {
        await handleBuffer(buffer);
      });
      const unsubError = window.electronAPI.onFileError(({ message }) => {
        setError(message);
      });
      return () => {
        unsubOpened();
        unsubError();
      };
    }
  }, [handleBuffer]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.toLowerCase().endsWith('.xmind')) {
      handleFileDrop(files[0]);
    }
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key === 'f') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      }
      if (e.key === 'Escape') {
        // lightbox 的 Escape 由 ImageLightbox 自己处理（capture phase）
        // 这里只处理取消选中
        if (!useMindMapStore.getState().lightboxImage) {
          useMindMapStore.getState().selectNode(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!data) {
    return (
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: theme === 'dark' ? '#1D1D1F' : '#F5F5F7',
          color: theme === 'dark' ? '#F5F5F7' : '#1D1D1F',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
        }}
      >
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: 'linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24, boxShadow: '0 8px 32px rgba(10,132,255,0.25)',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px' }}>XMind Reader</h2>
        <p style={{ color: theme === 'dark' ? '#8E8E93' : '#636366', margin: '0 0 32px', fontSize: 15 }}>拖拽 .xmind 文件到此处，或点击打开</p>
        <button
          onClick={handleOpenFile}
          disabled={loading}
          style={{
            padding: '10px 28px', fontSize: 15, fontWeight: 500,
            background: loading ? '#C7C7CC' : '#0A84FF', color: '#fff',
            border: 'none', borderRadius: 20, cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: loading ? 'none' : '0 2px 12px rgba(10,132,255,0.3)',
          }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="31.4 31.4" transform="rotate(-90 12 12)"/>
              </svg>
              加载中...
            </span>
          ) : '打开文件'}
        </button>
        {error && (
          <div style={{
            marginTop: 20, padding: '10px 16px',
            background: theme === 'dark' ? 'rgba(255,59,48,0.15)' : '#FFF2F2',
            color: '#FF3B30', borderRadius: 10, fontSize: 13, maxWidth: 400,
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: theme === 'dark' ? '#1D1D1F' : '#F5F5F7',
        color: theme === 'dark' ? '#F5F5F7' : '#1D1D1F',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
      }}
    >
      <Toolbar />
      <SheetTabs />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <SearchBar />
          <div style={{ flex: 1, position: 'relative' }}>
            <MindMapViewer />
          </div>
        </div>
        {isNotePanelOpen && <NotePanel />}
      </div>
      <ImageLightbox />
    </div>
  );
};
