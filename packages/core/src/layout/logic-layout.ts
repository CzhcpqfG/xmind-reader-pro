import type { MindMapNode, LayoutResult, LayoutNode, StructureClass, Summary, SummaryLayout } from '../types/index';
import { estimateNodeSize } from '../utils/text-measurer';
import type { LayoutOptions } from './layout-engine';

const H_GAP = 60;
const V_GAP = 16;
const BRACKET_OFFSET = 20;
const CONTENT_PADDING = 12;
const CONTENT_MIN_WIDTH = 180;
const CONTENT_MAX_WIDTH = 320;

export function applyLogicLayout(root: MindMapNode, structureClass: StructureClass, options?: LayoutOptions): LayoutResult {
  const layoutRoot = buildLayoutNode(root, 0, options);
  const direction = structureClass === 'org.xmind.ui.logic.left' ? 'left' : 'right';

  // Layout all children
  const rootChildX = direction === 'right'
    ? layoutRoot.width + H_GAP
    : -H_GAP;

  let currentY = 0;
  for (const child of layoutRoot.children) {
    child.x = direction === 'right' ? rootChildX : rootChildX - child.width;
    child.y = currentY;
    child.direction = direction;
    layoutChildren(child, direction);
    currentY += getSubtreeHeight(child) + V_GAP;
  }

  // Root at origin
  layoutRoot.x = 0;
  layoutRoot.y = 0;

  // Center children vertically around root
  const totalH = layoutRoot.children.reduce((sum, c) => sum + getSubtreeHeight(c) + V_GAP, -V_GAP);
  const offsetY = -totalH / 2;
  for (const child of layoutRoot.children) {
    applyOffset(child, offsetY);
  }

  // Compute summary layouts after main layout is done
  const summaryLayouts = computeSummaryLayouts(options?.summaries, layoutRoot);

  const bounds = computeBounds(layoutRoot);
  let minX = bounds.minX;
  let minY = bounds.minY;
  let maxX = bounds.maxX;
  let maxY = bounds.maxY;
  for (const sl of summaryLayouts) {
    minX = Math.min(minX, sl.x, sl.contentX);
    minY = Math.min(minY, sl.y, sl.contentY);
    maxX = Math.max(maxX, sl.x + sl.width, sl.contentX + sl.width);
    maxY = Math.max(maxY, sl.y + sl.height, sl.contentY + sl.height);
  }

  return {
    root: layoutRoot,
    width: maxX - minX + H_GAP * 2,
    height: maxY - minY + V_GAP * 2,
    offsetX: -minX + H_GAP,
    offsetY: -minY + V_GAP,
    summaryLayouts: summaryLayouts.length > 0 ? summaryLayouts : undefined,
  };
}

function computeSummaryLayouts(summaries: Summary[] | undefined, layoutRoot: LayoutNode): SummaryLayout[] {
  if (!summaries || summaries.length === 0) return [];
  const result: SummaryLayout[] = [];

  for (const summary of summaries) {
    const nodes = findLayoutNodesByIds(layoutRoot, summary.range);
    if (nodes.length === 0) continue;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    const direction = determineDirection(nodes, layoutRoot);
    const { width: contentWidth, height: contentHeight } = computeSummaryContentSize(summary);
    const coveredCenterY = (minY + maxY) / 2;
    const contentTopY = coveredCenterY - contentHeight / 2;

    let contentX: number;
    let bracketPath: string;
    const GAP = 4;
    const tipX = direction === 'right'
      ? maxX + GAP + BRACKET_OFFSET
      : minX - GAP - BRACKET_OFFSET;

    if (direction === 'right') {
      contentX = tipX + CONTENT_PADDING;
      bracketPath = buildBracketPathRight(maxX + GAP, minY, maxY, tipX);
    } else {
      contentX = tipX - CONTENT_PADDING - contentWidth;
      bracketPath = buildBracketPathLeft(minX - GAP, minY, maxY, tipX);
    }

    result.push({
      id: summary.id,
      x: direction === 'right' ? maxX + GAP : tipX,
      y: minY,
      width: Math.abs(tipX - (direction === 'right' ? maxX + GAP : minX - GAP)),
      height: maxY - minY,
      bracketPath,
      direction,
      contentX,
      contentY: contentTopY,
    });
  }

  return result;
}

function buildBracketPathRight(startX: number, minY: number, maxY: number, tipX: number): string {
  const midY = (minY + maxY) / 2;
  const midX = (startX + tipX) / 2;
  return [
    `M ${startX} ${minY}`,
    `L ${midX} ${minY}`,
    `L ${tipX} ${midY}`,
    `L ${midX} ${maxY}`,
    `L ${startX} ${maxY}`,
  ].join(' ');
}

function buildBracketPathLeft(startX: number, minY: number, maxY: number, tipX: number): string {
  const midY = (minY + maxY) / 2;
  const midX = (startX + tipX) / 2;
  return [
    `M ${startX} ${minY}`,
    `L ${midX} ${minY}`,
    `L ${tipX} ${midY}`,
    `L ${midX} ${maxY}`,
    `L ${startX} ${maxY}`,
  ].join(' ');
}

function determineDirection(nodes: LayoutNode[], root: LayoutNode): 'left' | 'right' {
  const rootCenterX = root.x + root.width / 2;
  let rightCount = 0;
  let leftCount = 0;
  for (const node of nodes) {
    const nodeCenterX = node.x + node.width / 2;
    if (nodeCenterX >= rootCenterX) rightCount++;
    else leftCount++;
  }
  return rightCount >= leftCount ? 'right' : 'left';
}

function computeSummaryContentSize(summary: Summary): { width: number; height: number } {
  const titleFontSize = summary.style?.fontSize || 14;
  const titleWidth = summary.title
    ? estimateTextWidth(summary.title, titleFontSize) + 16
    : 0;
  const titleHeight = summary.title ? titleFontSize * 1.6 + 8 : 0;

  let imageWidth = 0;
  let imageHeight = 0;
  if (summary.image?.buffer) {
    imageWidth = summary.image.width
      ? Math.min(summary.image.width, CONTENT_MAX_WIDTH - 16)
      : CONTENT_MIN_WIDTH;
    imageHeight = summary.image.height
      ? Math.min(summary.image.height, 160)
      : 80;
  }

  let childrenWidth = 0;
  let childrenHeight = 0;
  if (summary.children && summary.children.length > 0) {
    const childFontSize = Math.max(11, titleFontSize - 2);
    for (const child of summary.children) {
      const childTextWidth = child.title
        ? estimateTextWidth(child.title, childFontSize) + 16
        : 0;
      const childImgWidth = child.image?.buffer ? 68 : 0;
      childrenWidth = Math.max(childrenWidth, childTextWidth + childImgWidth);
      childrenHeight += Math.max(childFontSize * 1.6, child.image?.buffer ? 44 : 0) + 4;
    }
    childrenHeight += 8;
  }

  const contentWidth = Math.max(CONTENT_MIN_WIDTH,
    Math.min(CONTENT_MAX_WIDTH,
      Math.max(titleWidth, imageWidth + 16, childrenWidth + 16) + 16
    )
  );
  const contentHeight = titleHeight
    + (imageHeight > 0 ? imageHeight + 8 : 0)
    + (childrenHeight > 0 ? childrenHeight + 4 : 0)
    + 12;

  return { width: contentWidth, height: Math.max(contentHeight, 40) };
}

function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    const isCJK = (code >= 0x4E00 && code <= 0x9FFF) ||
      (code >= 0x3400 && code <= 0x4DBF) ||
      (code >= 0x3000 && code <= 0x303F) ||
      (code >= 0xFF00 && code <= 0xFFEF);
    width += isCJK ? fontSize * 1.05 : fontSize * 0.55;
  }
  return width;
}

function findLayoutNodesByIds(root: LayoutNode, ids: string[]): LayoutNode[] {
  const idSet = new Set(ids);
  const result: LayoutNode[] = [];
  function traverse(node: LayoutNode): void {
    if (idSet.has(node.id)) {
      result.push(node);
      // 一旦找到匹配的节点，将其所有后代也加入结果
      // 因为 summary 大括号需要覆盖整个子树
      addAllDescendants(node);
    } else {
      for (const child of node.children) traverse(child);
    }
  }
  function addAllDescendants(node: LayoutNode): void {
    for (const child of node.children) {
      result.push(child);
      addAllDescendants(child);
    }
  }
  traverse(root);
  return result;
}

function layoutChildren(node: LayoutNode, direction: 'left' | 'right'): void {
  const childX = direction === 'right'
    ? node.x + node.width + H_GAP
    : node.x - H_GAP;
  let currentY = node.y;
  for (const child of node.children) {
    child.x = direction === 'right' ? childX : childX - child.width;
    child.y = currentY;
    child.direction = direction;
    layoutChildren(child, direction);
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

function computeBounds(node: LayoutNode) {
  let minX = node.x, minY = node.y, maxX = node.x + node.width, maxY = node.y + node.height;
  for (const child of node.children) {
    const b = computeBounds(child);
    minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY);
  }
  return { minX, minY, maxX, maxY };
}
