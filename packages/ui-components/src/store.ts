import { create } from 'zustand';
import type { MindMapData, MindMapNode, Sheet, SearchResult, ImageData } from '@xmind-reader/core';

interface MindMapState {
  data: MindMapData | null;
  activeSheetIndex: number;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  collapsedNodeIds: Set<string>;
  searchResults: SearchResult[];
  searchQuery: string;
  currentSearchIndex: number;
  theme: 'light' | 'dark';
  scale: number;
  isFullscreen: boolean;
  isNotePanelOpen: boolean;
  lightboxImage: ImageData | null;

  setData: (data: MindMapData) => void;
  setActiveSheet: (index: number) => void;
  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  toggleCollapse: (nodeId: string) => void;
  setSearchResults: (results: SearchResult[], query: string) => void;
  nextSearchResult: () => void;
  prevSearchResult: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setScale: (scale: number) => void;
  toggleFullscreen: () => void;
  toggleNotePanel: () => void;
  openLightbox: (image: ImageData) => void;
  closeLightbox: () => void;
  reset: () => void;
}

export const useMindMapStore = create<MindMapState>((set, get) => ({
  data: null,
  activeSheetIndex: 0,
  selectedNodeId: null,
  hoveredNodeId: null,
  collapsedNodeIds: new Set(),
  searchResults: [],
  searchQuery: '',
  currentSearchIndex: -1,
  theme: 'light',
  scale: 1,
  isFullscreen: false,
  isNotePanelOpen: false,
  lightboxImage: null,

  setData: (data) => set({ data, activeSheetIndex: 0, selectedNodeId: null, collapsedNodeIds: new Set(), searchResults: [], searchQuery: '', currentSearchIndex: -1 }),
  setActiveSheet: (index) => set({ activeSheetIndex: index, selectedNodeId: null }),
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  hoverNode: (nodeId) => set({ hoveredNodeId: nodeId }),
  toggleCollapse: (nodeId) => set((state) => {
    const next = new Set(state.collapsedNodeIds);
    if (next.has(nodeId)) next.delete(nodeId);
    else next.add(nodeId);
    return { collapsedNodeIds: next };
  }),
  setSearchResults: (results, query) => set({ searchResults: results, searchQuery: query, currentSearchIndex: results.length > 0 ? 0 : -1 }),
  nextSearchResult: () => set((state) => {
    if (state.searchResults.length === 0) return {};
    const next = (state.currentSearchIndex + 1) % state.searchResults.length;
    return { currentSearchIndex: next, selectedNodeId: state.searchResults[next].nodeId };
  }),
  prevSearchResult: () => set((state) => {
    if (state.searchResults.length === 0) return {};
    const prev = (state.currentSearchIndex - 1 + state.searchResults.length) % state.searchResults.length;
    return { currentSearchIndex: prev, selectedNodeId: state.searchResults[prev].nodeId };
  }),
  setTheme: (theme) => set({ theme }),
  setScale: (scale) => set({ scale: Math.max(0.05, Math.min(4, scale)) }),
  toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
  toggleNotePanel: () => set((state) => ({ isNotePanelOpen: !state.isNotePanelOpen })),
  openLightbox: (image) => set({ lightboxImage: image }),
  closeLightbox: () => set({ lightboxImage: null }),
  reset: () => set({
    data: null, activeSheetIndex: 0, selectedNodeId: null, hoveredNodeId: null,
    collapsedNodeIds: new Set(), searchResults: [], searchQuery: '', currentSearchIndex: -1,
    scale: 1, lightboxImage: null,
  }),
}));
