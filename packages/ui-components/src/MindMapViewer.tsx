import React, { useRef, useEffect } from 'react';
import { MindMapRenderer, DEFAULT_THEME, DARK_THEME } from '@xmind-reader/renderer';
import { useMindMapStore } from './store';

export const MindMapViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MindMapRenderer | null>(null);
  const data = useMindMapStore((s) => s.data);
  const activeSheetIndex = useMindMapStore((s) => s.activeSheetIndex);
  const theme = useMindMapStore((s) => s.theme);

  // 初始化渲染器
  useEffect(() => {
    if (!containerRef.current) return;
    const renderer = new MindMapRenderer({
      container: containerRef.current,
      onNodeClick: (node) => useMindMapStore.getState().selectNode(node.id),
      onNodeHover: (node) => useMindMapStore.getState().hoverNode(node?.id ?? null),
      onCollapseToggle: (nodeId) => useMindMapStore.getState().toggleCollapse(nodeId),
    });
    rendererRef.current = renderer;
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // 数据变化时重新渲染
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !data || !data.sheets[activeSheetIndex]) return;

    const sheet = data.sheets[activeSheetIndex];
    try {
      renderer.setData(sheet.rootTopic, sheet.structureClass, sheet.theme);
      renderer.setSheetData(
        sheet.summaries || [],
        sheet.boundaries || [],
        sheet.relationships || []
      );
    } catch (err) {
      console.error('Layout/render failed:', err);
    }
  }, [data, activeSheetIndex]);

  // 主题变化时更新
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.updateTheme(theme === 'dark' ? DARK_THEME : DEFAULT_THEME);
  }, [theme]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
  );
};
