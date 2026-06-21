import type { MindMapNode, LayoutResult, LayoutNode, StructureClass } from '../types/index';
import { estimateNodeSize } from '../utils/text-measurer';
import type { LayoutOptions } from './layout-engine';

const H_GAP = 40;
const V_GAP = 24;
const LEVEL_HEIGHT = 90;

export function applyTreeLayout(root: MindMapNode, _structureClass: StructureClass, options?: LayoutOptions): LayoutResult {
  const layoutRoot = buildLayoutNode(root, 0, options);
  layoutRoot.direction = 'down';

  // Layout children recursively (bottom-up: first layout grandchildren, then position children)
  layoutSubtree(layoutRoot);

  const bounds = computeBounds(layoutRoot);

  return {
    root: layoutRoot,
    width: bounds.maxX - bounds.minX + H_GAP * 2,
    height: bounds.maxY - bounds.minY + V_GAP * 2,
    offsetX: -bounds.minX + H_GAP,
    offsetY: -bounds.minY + V_GAP,
  };
}

function layoutSubtree(node: LayoutNode): void {
  if (node.children.length === 0) return;

  // First layout all children's subtrees
  for (const child of node.children) {
    child.direction = 'down';
    layoutSubtree(child);
  }

  // Now position children horizontally
  let currentX = 0;
  const childY = node.y + LEVEL_HEIGHT;

  for (const child of node.children) {
    positionSubtree(child, currentX, childY);
    currentX += getSubtreeWidth(child) + H_GAP;
  }

  // Center parent over children
  if (node.children.length > 0) {
    const firstChild = node.children[0];
    const lastChild = node.children[node.children.length - 1];
    const childrenCenter = (firstChild.x + lastChild.x + lastChild.width) / 2;
    // Shift entire subtree so parent is centered
    const shift = childrenCenter - (node.x + node.width / 2);
    // Instead of shifting parent, shift children
    for (const child of node.children) {
      shiftSubtree(child, -shift);
    }
  }
}

function positionSubtree(node: LayoutNode, startX: number, startY: number): void {
  const dx = startX - node.x;
  const dy = startY - node.y;
  shiftSubtree(node, dx);
  shiftSubtree(node, dy);
}

function shiftSubtree(node: LayoutNode, dx: number): void {
  node.x += dx;
  for (const child of node.children) shiftSubtree(child, dx);
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
    depth, direction: 'down',
  };
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
