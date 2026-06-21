import React, { useCallback, useState } from 'react';
import { useMindMapStore } from './store';

export const ExportDialog: React.FC = () => {
  const data = useMindMapStore((s) => s.data);
  const activeSheetIndex = useMindMapStore((s) => s.activeSheetIndex);
  const [open, setOpen] = useState(false);
  const toggleExportDialog = useCallback(() => setOpen(v => !v), []);

  const handleExportSVG = useCallback(() => {
    const svgEl = document.querySelector('.mindmap-container svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xmind-export.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toggleExportDialog();
  }, [toggleExportDialog]);

  const handleExportPNG = useCallback(() => {
    const svgEl = document.querySelector('.mindmap-container svg') as SVGSVGElement | null;
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `xmind-export.png`;
        a.click();
        URL.revokeObjectURL(url);
        toggleExportDialog();
      }, 'image/png');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, [toggleExportDialog]);

  const handleExportMarkdown = useCallback(() => {
    if (!data) return;
    const sheet = data.sheets[activeSheetIndex];
    const lines: string[] = [];
    function walkTree(node: any, depth: number) {
      const prefix = depth === 0 ? '# ' : '  '.repeat(depth - 1) + '- ';
      lines.push(prefix + node.title);
      if (node.notes?.plain) {
        lines.push('  '.repeat(depth) + '  > ' + node.notes.plain.replace(/\n/g, '\n' + '  '.repeat(depth) + '  > '));
      }
      for (const child of (node.children || [])) {
        walkTree(child, depth + 1);
      }
      if (node.detachedChildren) {
        for (const child of node.detachedChildren) {
          walkTree(child, depth + 1);
        }
      }
    }
    walkTree(sheet.rootTopic, 0);
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xmind-export.md`;
    a.click();
    URL.revokeObjectURL(url);
    toggleExportDialog();
  }, [data, activeSheetIndex, toggleExportDialog]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 8, padding: 24,
        minWidth: 320, boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
      }}>
        <h3 style={{ margin: '0 0 16px 0' }}>导出</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={handleExportSVG}
            style={{ padding: '10px 16px', fontSize: 14, cursor: 'pointer', border: '1px solid #ddd', borderRadius: 4, background: '#fff' }}
          >
            导出 SVG
          </button>
          <button
            onClick={handleExportPNG}
            style={{ padding: '10px 16px', fontSize: 14, cursor: 'pointer', border: '1px solid #ddd', borderRadius: 4, background: '#fff' }}
          >
            导出 PNG
          </button>
          <button
            onClick={handleExportMarkdown}
            style={{ padding: '10px 16px', fontSize: 14, cursor: 'pointer', border: '1px solid #ddd', borderRadius: 4, background: '#fff' }}
          >
            导出 Markdown
          </button>
        </div>
        <button
          onClick={toggleExportDialog}
          style={{ marginTop: 16, padding: '8px 16px', fontSize: 13, cursor: 'pointer', border: '1px solid #ccc', borderRadius: 4, background: '#f5f5f5' }}
        >
          取消
        </button>
      </div>
    </div>
  );
};
