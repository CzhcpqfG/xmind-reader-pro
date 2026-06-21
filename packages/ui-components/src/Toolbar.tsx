import React from 'react';
import { useMindMapStore } from './store';

const IconButton: React.FC<{
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  active?: boolean;
}> = ({ onClick, title, children, active }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 32, height: 32, borderRadius: 8,
      border: 'none', background: active ? 'rgba(10,132,255,0.12)' : 'transparent',
      color: active ? '#0A84FF' : '#636366',
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s ease',
    }}
    onMouseEnter={(e) => {
      if (!active) e.currentTarget.style.background = 'rgba(120,120,128,0.12)';
    }}
    onMouseLeave={(e) => {
      if (!active) e.currentTarget.style.background = 'transparent';
    }}
  >
    {children}
  </button>
);

// 缩放回调由外部注入（App.tsx 绑定到 renderer 实例）
let zoomCallbacks: { zoomIn: () => void; zoomOut: () => void; fitToView: () => void } | null = null;
let exportMarkdownCallback: (() => void) | null = null;

export function setZoomCallbacks(cb: { zoomIn: () => void; zoomOut: () => void; fitToView: () => void }) {
  zoomCallbacks = cb;
}

export function setExportMarkdownCallback(cb: () => void) {
  exportMarkdownCallback = cb;
}

export const Toolbar: React.FC = () => {
  const theme = useMindMapStore((s) => s.theme);
  const setTheme = useMindMapStore((s) => s.setTheme);
  const scale = useMindMapStore((s) => s.scale);
  const isFullscreen = useMindMapStore((s) => s.isFullscreen);
  const toggleFullscreen = useMindMapStore((s) => s.toggleFullscreen);
  const isNotePanelOpen = useMindMapStore((s) => s.isNotePanelOpen);
  const toggleNotePanel = useMindMapStore((s) => s.toggleNotePanel);

  const isDark = theme === 'dark';

  const handleZoomIn = () => zoomCallbacks?.zoomIn();
  const handleZoomOut = () => zoomCallbacks?.zoomOut();
  const handleFitToView = () => zoomCallbacks?.fitToView();

  return (
    <div
      style={{
        position: 'absolute',
        top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '6px 12px',
        borderRadius: 14,
        background: isDark ? 'rgba(44,44,46,0.72)' : 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: isDark
          ? '0 1px 3px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)'
          : '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      {/* Zoom out */}
      <IconButton onClick={handleZoomOut} title="缩小">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </IconButton>

      {/* Zoom percentage */}
      <span style={{
        fontSize: 12, fontWeight: 500, color: isDark ? '#8E8E93' : '#636366',
        minWidth: 42, textAlign: 'center', userSelect: 'none',
      }}>
        {Math.round(scale * 100)}%
      </span>

      {/* Zoom in */}
      <IconButton onClick={handleZoomIn} title="放大">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </IconButton>

      {/* Fit to view */}
      <IconButton onClick={handleFitToView} title="适应窗口">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
          <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
          <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
          <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
        </svg>
      </IconButton>

      <div style={{ width: 1, height: 18, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', margin: '0 4px' }} />

      {/* Export Markdown */}
      <IconButton onClick={() => exportMarkdownCallback?.()} title="导出 Markdown">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </IconButton>

      {/* Note panel toggle */}
      <IconButton onClick={toggleNotePanel} title="备注" active={isNotePanelOpen}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </IconButton>

      {/* Theme toggle */}
      <IconButton onClick={() => setTheme(isDark ? 'light' : 'dark')} title={isDark ? '切换亮色' : '切换暗色'}>
        {isDark ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </IconButton>

      {/* Fullscreen */}
      <IconButton onClick={toggleFullscreen} title="全屏">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isFullscreen ? (
            <>
              <path d="M8 3v3a2 2 0 0 1-2 2H3"/>
              <path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
              <path d="M3 16h3a2 2 0 0 1 2 2v3"/>
              <path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
            </>
          ) : (
            <>
              <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
              <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
              <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
              <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
            </>
          )}
        </svg>
      </IconButton>
    </div>
  );
};
