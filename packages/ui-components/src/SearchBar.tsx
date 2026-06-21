import React, { useState, useCallback } from 'react';
import { useMindMapStore } from './store';
import type { MindMapNode, SearchResult } from '@xmind-reader/core';

function searchInTree(node: MindMapNode, query: string, results: SearchResult[]): void {
  const lowerQuery = query.toLowerCase();

  // Search in title
  const lowerTitle = node.title.toLowerCase();
  let index = 0;
  const matches: { start: number; end: number; text: string }[] = [];
  while ((index = lowerTitle.indexOf(lowerQuery, index)) !== -1) {
    matches.push({ start: index, end: index + query.length, text: node.title.substring(index, index + query.length) });
    index += query.length;
  }

  // Search in notes
  if (node.notes?.plain && node.notes.plain.toLowerCase().includes(lowerQuery)) {
    if (matches.length === 0) {
      matches.push({ start: 0, end: 0, text: '(备注匹配)' });
    }
  }

  // Search in labels
  if (node.labels) {
    for (const label of node.labels) {
      if (label.toLowerCase().includes(lowerQuery)) {
        if (matches.length === 0) {
          matches.push({ start: 0, end: 0, text: '(标签匹配)' });
        }
        break;
      }
    }
  }

  // Search in comments
  if (node.comments) {
    for (const comment of node.comments) {
      if (comment.content.toLowerCase().includes(lowerQuery)) {
        if (matches.length === 0) {
          matches.push({ start: 0, end: 0, text: '(评论匹配)' });
        }
        break;
      }
    }
  }

  if (matches.length > 0) {
    results.push({ nodeId: node.id, title: node.title, matches });
  }

  for (const child of node.children) {
    searchInTree(child, query, results);
  }
  if (node.detachedChildren) {
    for (const child of node.detachedChildren) {
      searchInTree(child, query, results);
    }
  }
}

export const SearchBar: React.FC = () => {
  const [input, setInput] = useState('');
  const data = useMindMapStore((s) => s.data);
  const activeSheetIndex = useMindMapStore((s) => s.activeSheetIndex);
  const searchResults = useMindMapStore((s) => s.searchResults);
  const currentSearchIndex = useMindMapStore((s) => s.currentSearchIndex);
  const setSearchResults = useMindMapStore((s) => s.setSearchResults);
  const nextSearchResult = useMindMapStore((s) => s.nextSearchResult);
  const prevSearchResult = useMindMapStore((s) => s.prevSearchResult);

  const handleSearch = useCallback(() => {
    if (!data || !input.trim()) {
      setSearchResults([], '');
      return;
    }
    const results: SearchResult[] = [];
    searchInTree(data.sheets[activeSheetIndex].rootTopic, input.trim(), results);
    setSearchResults(results, input.trim());
  }, [data, activeSheetIndex, input, setSearchResults]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        placeholder="搜索节点、备注、标签..."
        style={{ flex: 1, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
      />
      <button onClick={handleSearch} style={{ padding: '4px 8px', fontSize: 13 }}>搜索</button>
      {searchResults.length > 0 && (
        <>
          <button onClick={prevSearchResult} style={{ padding: '4px 8px', fontSize: 12 }}>↑</button>
          <span style={{ fontSize: 12, color: '#666' }}>{currentSearchIndex + 1}/{searchResults.length}</span>
          <button onClick={nextSearchResult} style={{ padding: '4px 8px', fontSize: 12 }}>↓</button>
        </>
      )}
    </div>
  );
};
