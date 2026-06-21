import React, { useMemo, useEffect } from 'react';
import { useMindMapStore } from './store';
import { findNodeById, getMarkerEmoji } from '@xmind-reader/core';

export const NotePanel: React.FC = () => {
  const data = useMindMapStore((s) => s.data);
  const activeSheetIndex = useMindMapStore((s) => s.activeSheetIndex);
  const selectedNodeId = useMindMapStore((s) => s.selectedNodeId);
  const isOpen = useMindMapStore((s) => s.isNotePanelOpen);
  const theme = useMindMapStore((s) => s.theme);
  const openLightbox = useMindMapStore((s) => s.openLightbox);

  const isDark = theme === 'dark';

  const sheet = data?.sheets[activeSheetIndex];
  const node = selectedNodeId && sheet ? findNodeById(sheet.rootTopic, selectedNodeId) : null;

  // 管理 Blob URL 生命周期
  const nodeImageUrl = useMemo(() => {
    if (!node?.image?.buffer) return '';
    const blob = new Blob([node.image.buffer], { type: node.image.mediaType || 'image/png' });
    return URL.createObjectURL(blob);
  }, [node?.image?.buffer]);

  const noteImageUrls = useMemo(() => {
    if (!node?.notesImages) return [];
    return node.notesImages
      .filter(img => img.buffer)
      .map(img => {
        const blob = new Blob([img.buffer!], { type: img.mediaType || 'image/png' });
        return URL.createObjectURL(blob);
      });
  }, [node?.notesImages]);

  useEffect(() => {
    return () => {
      if (nodeImageUrl) URL.revokeObjectURL(nodeImageUrl);
      noteImageUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [nodeImageUrl, noteImageUrls]);

  if (!isOpen || !data || !selectedNodeId || !node) return null;

  const bgColor = isDark ? '#2C2C2E' : '#FFFFFF';
  const textColor = isDark ? '#F5F5F7' : '#1D1D1F';
  const subColor = isDark ? '#8E8E93' : '#636366';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e0e0e0';
  const itemBg = isDark ? 'rgba(255,255,255,0.05)' : '#f9f9f9';
  const labelBg = isDark ? 'rgba(10,132,255,0.15)' : '#e3f2fd';

  return (
    <div style={{ width: 280, borderLeft: `1px solid ${borderColor}`, padding: 16, overflow: 'auto', background: bgColor, color: textColor, flexShrink: 0 }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>{node.title}</h3>

      {node.notes?.plain && (
        <div style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, color: subColor, marginBottom: 4 }}>备注</h4>
          <p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{node.notes.plain}</p>
        </div>
      )}

      {node.href && (
        <div style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, color: subColor, marginBottom: 4 }}>链接</h4>
          <a href={node.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#0A84FF', wordBreak: 'break-all' }}>{node.href}</a>
        </div>
      )}

      {node.labels && node.labels.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, color: subColor, marginBottom: 4 }}>标签</h4>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {node.labels.map((label, i) => (
              <span key={i} style={{ padding: '2px 8px', background: labelBg, borderRadius: 4, fontSize: 12 }}>{label}</span>
            ))}
          </div>
        </div>
      )}

      {node.markers && node.markers.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, color: subColor, marginBottom: 4 }}>标记</h4>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {node.markers.map((m, i) => {
              const emoji = getMarkerEmoji(m.markerId);
              return emoji ? (
                <span key={i} style={{ padding: '2px 8px', background: itemBg, borderRadius: 4, fontSize: 13 }}>{emoji} {m.markerId}</span>
              ) : (
                <span key={i} style={{ padding: '2px 8px', background: itemBg, borderRadius: 4, fontSize: 12 }}>{m.markerId}</span>
              );
            })}
          </div>
        </div>
      )}

      {node.comments && node.comments.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, color: subColor, marginBottom: 4 }}>评论</h4>
          {node.comments.map((c, i) => (
            <div key={i} style={{ marginBottom: 8, padding: '6px 8px', background: itemBg, borderRadius: 4 }}>
              <div style={{ fontSize: 12, color: subColor, marginBottom: 2 }}>
                {c.author}{c.time ? ` · ${c.time}` : ''}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>{c.content}</div>
            </div>
          ))}
        </div>
      )}

      {node.notesImages && node.notesImages.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, color: subColor, marginBottom: 4 }}>备注图片</h4>
          {node.notesImages.map((img, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <img
                src={noteImageUrls[i]}
                alt={img.src}
                style={{ maxWidth: '100%', borderRadius: 4, cursor: 'pointer' }}
                onClick={() => img.buffer && openLightbox(img)}
              />
              <div style={{ fontSize: 11, color: subColor, marginTop: 2 }}>{img.src}</div>
            </div>
          ))}
        </div>
      )}

      {node.image?.buffer && nodeImageUrl && (
        <div style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, color: subColor, marginBottom: 4 }}>节点图片</h4>
          <img
            src={nodeImageUrl}
            alt={node.title}
            style={{ maxWidth: '100%', borderRadius: 4, cursor: 'pointer' }}
            onClick={() => openLightbox(node.image!)}
          />
        </div>
      )}
    </div>
  );
};
