import React, { useEffect, useState, useCallback } from 'react';
import { parseXMind, MindMapData } from '@xmind-reader/core';
import { MindMapViewer, SearchBar, NotePanel, Toolbar, SheetTabs, ImageLightbox, useMindMapStore } from '@xmind-reader/ui-components';

export const SidePanelApp: React.FC = () => {
  const data = useMindMapStore((s) => s.data);
  const setData = useMindMapStore((s) => s.setData);
  const theme = useMindMapStore((s) => s.theme);
  const isNotePanelOpen = useMindMapStore((s) => s.isNotePanelOpen);

  // Load data from storage
  useEffect(() => {
    chrome.storage.local.get('lastFile', (result) => {
      if (result.lastFile?.data) {
        try {
          const parsed = JSON.parse(result.lastFile.data) as MindMapData;
          setData(parsed);
        } catch (err) {
          console.error('Failed to load file:', err);
        }
      }
    });
  }, [setData]);

  // Listen for storage changes
  useEffect(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.lastFile?.newValue?.data) {
        try {
          const parsed = JSON.parse(changes.lastFile.newValue.data) as MindMapData;
          setData(parsed);
        } catch {}
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [setData]);

  const handleFileDrop = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    const parsed = await parseXMind(buffer);
    setData(parsed);
    chrome.storage.local.set({ lastFile: { name: file.name, data: JSON.stringify(parsed) } });
  }, [setData]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.xmind')) handleFileDrop(file);
  };

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
          color: theme === 'dark' ? '#8E8E93' : '#636366',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
        }}
      >
        <p>请在弹出窗口中选择 .xmind 文件</p>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: theme === 'dark' ? '#1D1D1F' : '#F5F5F7',
      color: theme === 'dark' ? '#F5F5F7' : '#1D1D1F',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
    }}>
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
