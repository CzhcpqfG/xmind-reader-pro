import type { MindMapNode, LayoutResult, LayoutNode, StructureClass } from '../types/index';
import { estimateNodeSize } from '../utils/text-measurer';
import type { LayoutOptions } from './layout-engine';

const H_GAP = 60;
const V_GAP = 16;
const BRANCH_LENGTH = 200;

export function applyFishboneLayout(root: MindMapNode, _structureClass: StructureClass, options?: LayoutOptions): LayoutResult {
  const layoutRoot = buildLayoutNode(root, 0, options);
  layoutRoot.x = 0;
  layoutRoot.y = 0;

  const halfCount = Math.ceil(layoutRoot.children.length / 2);
  const topChildren = layoutRoot.children.slice(0, halfCount);
  const bottomChildren = layoutRoot.children.slice(halfCount);

  // Top branches
  let topX = layoutRoot.width + H_GAP;
  let topY = 0;
  for (const child of topChildren) {
    child.x = topX;
    child.y = -BRANCH_LENGTH;
    child.direction = 'right';
    layoutFishboneSubtree(child);
    topX += getSubtreeWidth(child) + H_GAP;
  }

  // Bottom branches
  let bottomX = layoutRoot.width + H_GAP;
  for (const child of bottomChildren) {
    child.x = bottomX;
    child.y = BRANCH_LENGTH;
    child.direction = 'right';
    layoutFishboneSubtree(child);
    bottomX += getSubtreeWidth(child) + H_GAP;
  }

  // Center top/bottom vertically
  const topH = topChildren.reduce((s, c) => s + getSubtreeHeight(c) + V_GAP, -V_GAP);
  const bottomH = bottomChildren.reduce((s, c) => s + getSubtreeHeight(c) + V_GAP, -V_GAP);
  for (const child of topChildren) applyOffset(child, -topH / 2);
  for (const child of bottomChildren) applyOffset(child, -bottomH / 2);

  const bounds = computeBounds(layoutRoot);

  return {
    root: layoutRoot,
    width: bounds.maxX - bounds.minX + H_GAP * 2,
    height: bounds.maxY - bounds.minY + V_GAP * 2,
    offsetX: -bounds.minX + H_GAP,
    offsetY: -bounds.minY + V_GAP,
  };
}

function layoutFishboneSubtree(node: LayoutNode): void {
  let currentY = node.y;
  for (const child of node.children) {
    child.x = node.x + node.width + H_GAP;
    child.y = currentY;
    child.direction = node.direction;
    layoutFishboneSubtree(child);
    currentY += getSubtreeHeight(child) + V_GAP;
  }
}

function applyOffset(node: LayoutNode, offsetY: number): void {
  node.y += offsetY;
  for (const child of node.children) applyOffset(child, offsetY);
}

function buildLayoutNode(node: MindMapNode, depth: number, options?: LayoutOptions): LayoutNode {
  const precomputed = options?.sizeMap?.get(node.id);
  let size = precomputed;
  if (!size) {
    size = estimateNodeSize(node.title, depth, !!node.image, node.image?.width, node.image?.height, node.customWidth);
  }
  const isCollapsed = options?.collapsedNodeIds?.has(node.id);
  const children = isCollapsed
    ? []
    : node.children.map(child => buildLayoutNode(child, depth + 1, options));
  return {
    id: node.id, x: 0, y: 0,
    width: size.width, height: size.height,
    data: node,
    children,
    depth,
  };
}

function getSubtreeHeight(node: LayoutNode): number {
  if (node.children.length === 0) return node.height;
  let h = 0;
  for (const child of node.children) h += getSubtreeHeight(child) + V_GAP;
  return Math.max(node.height, h - V_GAP);
}

function getSubtreeWidth(node: LayoutNode): number {
  if (node.children.length === 0) return node.width;
  let w = 0;
  for (const child of node.children) w += getSubtreeWidth(child) + H_GAP;
  return Math.max(node.width, w - H_GAP);
}

function computeBounds(node: LayoutNode) {
  let minX = node.x, minY = node.y, maxX = node.x + node.width, maxY = node.y + node.height;
  for (const child of node.children) {
    const b = computeBounds(child);
    minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY);
  }
  return { minX, minY, maxX, maxY };
}
