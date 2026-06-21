import React, { useCallback, useRef } from 'react';
import { parseXMind } from '@xmind-reader/core';

export const PopupApp: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const parsed = await parseXMind(buffer);

    // Store parsed data and open side panel
    chrome.storage.local.set({ lastFile: { name: file.name, data: JSON.stringify(parsed) } });

    // Open side panel
    chrome.sidePanel?.open?.({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file?.name.endsWith('.xmind')) return;

    const buffer = await file.arrayBuffer();
    const parsed = await parseXMind(buffer);
    chrome.storage.local.set({ lastFile: { name: file.name, data: JSON.stringify(parsed) } });
    chrome.sidePanel?.open?.({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  }, []);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      style={{ padding: 20, textAlign: 'center' }}
    >
      <div style={{ fontSize: 36, marginBottom: 12 }}>🧠</div>
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>XMind Reader</h2>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
        选择或拖拽 .xmind 文件
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xmind"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: '8px 20px', fontSize: 14,
          background: '#4285f4', color: '#fff',
          border: 'none', borderRadius: 6, cursor: 'pointer',
        }}
      >
        选择文件
      </button>
      <div
        style={{
          marginTop: 16, padding: 20,
          border: '2px dashed #ddd', borderRadius: 8,
          color: '#999', fontSize: 13,
        }}
      >
        或拖拽文件到此处
      </div>
    </div>
  );
};
