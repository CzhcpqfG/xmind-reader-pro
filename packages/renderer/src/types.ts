import type { LayoutResult, MindMapNode, StructureClass, ImageData } from '@xmind-reader/core';

export interface RendererOptions {
  container: HTMLElement;
  theme?: ThemeConfig;
  initialScale?: number;
  minScale?: number;
  maxScale?: number;
  onNodeClick?: (node: MindMapNode) => void;
  onNodeHover?: (node: MindMapNode | null) => void;
  onCollapseToggle?: (nodeId: string) => void;
  onZoomChange?: (scale: number) => void;
  onImageClick?: (image: ImageData) => void;
}

export interface RendererState {
  scale: number;
  translateX: number;
  translateY: number;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  collapsedNodeIds: Set<string>;
  searchHighlightIds: Set<string>;
}

export interface ThemeConfig {
  name: string;
  background: string;
  nodeDefaults: {
    fillColor: string;
    textColor: string;
    borderColor: string;
    borderWidth: number;
    borderRadius: number;
    fontSize: number;
    fontFamily: string;
  };
  rootDefaults: {
    fillColor: string;
    textColor: string;
    borderColor: string;
    borderWidth: number;
    borderRadius: number;
    fontSize: number;
    fontFamily: string;
  };
  connectorColor: string;
  connectorWidth: number;
  connectorType: ConnectorType;
  summaryLineColor?: string;
  summaryLineWidth?: number;
  boundaryFillColor?: string;
  boundaryLineColor?: string;
}

export enum ConnectorType {
  Curve = 'curve',
  Polyline = 'polyline',
  Straight = 'straight',
}

// Apple Design System inspired light theme
export const DEFAULT_THEME: ThemeConfig = {
  name: 'light',
  background: '#F5F5F7',
  nodeDefaults: {
    fillColor: '#FFFFFF',
    textColor: '#1D1D1F',
    borderColor: 'transparent',
    borderWidth: 0,
    borderRadius: 10,
    fontSize: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
  },
  rootDefaults: {
    fillColor: '#0A84FF',
    textColor: '#FFFFFF',
    borderColor: 'transparent',
    borderWidth: 0,
    borderRadius: 14,
    fontSize: 18,
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
  },
  connectorColor: '#C7C7CC',
  connectorWidth: 1.5,
  connectorType: ConnectorType.Curve,
  summaryLineColor: '#8E8E93',
  summaryLineWidth: 1.5,
  boundaryFillColor: '#0A84FF',
  boundaryLineColor: '#0A84FF',
};

// Apple Design System inspired dark theme
export const DARK_THEME: ThemeConfig = {
  name: 'dark',
  background: '#1D1D1F',
  nodeDefaults: {
    fillColor: '#2C2C2E',
    textColor: '#F5F5F7',
    borderColor: 'transparent',
    borderWidth: 0,
    borderRadius: 10,
    fontSize: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
  },
  rootDefaults: {
    fillColor: '#0A84FF',
    textColor: '#FFFFFF',
    borderColor: 'transparent',
    borderWidth: 0,
    borderRadius: 14,
    fontSize: 18,
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
  },
  connectorColor: '#48484A',
  connectorWidth: 1.5,
  connectorType: ConnectorType.Curve,
  summaryLineColor: '#8E8E93',
  summaryLineWidth: 1.5,
  boundaryFillColor: '#0A84FF',
  boundaryLineColor: '#0A84FF',
};
