import type { LayoutNode, Boundary, NodeStyle } from '@xmind-reader/core';
import type { ThemeConfig } from './types';

const PADDING = 20;             // 边界框与节点之间的间距（从 12 增大到 20）
const BORDER_RADIUS = 8;
const TITLE_HEIGHT = 18;        // 标题占用的高度

export function renderBoundaries(
  parent: SVGGElement,
  layoutRoot: LayoutNode,
  boundaries: Boundary[],
  theme: ThemeConfig
): void {
  for (const boundary of boundaries) {
    const nodes = findLayoutNodesByIds(layoutRoot, boundary.range);
    if (nodes.length === 0) continue;

    // 计算边界框包围盒，只考虑同一层级的节点
    // 通过比较节点深度来确定是否属于同一层级
    const minDepth = Math.min(...nodes.map(n => n.depth));
    const sameLevelNodes = nodes.filter(n => n.depth === minDepth);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of sameLevelNodes) {
      const left = node.x;
      const top = node.y;
      const right = node.x + node.width;
      const bottom = node.y + node.height;
      if (left < minX) minX = left;
      if (top < minY) minY = top;
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    }

    // 如果没有同层级节点，回退到使用所有节点
    if (sameLevelNodes.length === 0) {
      for (const node of nodes) {
        const left = node.x;
        const top = node.y;
        const right = node.x + node.width;
        const bottom = node.y + node.height;
        if (left < minX) minX = left;
        if (top < minY) minY = top;
        if (right > maxX) maxX = right;
        if (bottom > maxY) maxY = bottom;
      }
    }

    const rectX = minX - PADDING;
    const rectY = minY - PADDING + (boundary.title ? TITLE_HEIGHT : 0);
    const rectWidth = maxX - minX + PADDING * 2;
    const rectHeight = maxY - minY + PADDING * 2;

    const style: NodeStyle | undefined = boundary.style;

    // 优先使用 theme 中的 boundary 样式
    const defaultFill = theme.boundaryFillColor
      ? hexToRgba(theme.boundaryFillColor, 0.08)
      : 'rgba(66, 133, 244, 0.08)';
    const defaultBorderColor = theme.boundaryLineColor || theme.connectorColor;
    const defaultBorderWidth = theme.connectorWidth || 1.5;

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('boundary');
    group.setAttribute('data-boundary-id', boundary.id);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(rectX));
    rect.setAttribute('y', String(rectY));
    rect.setAttribute('width', String(rectWidth));
    rect.setAttribute('height', String(rectHeight));
    rect.setAttribute('rx', String(BORDER_RADIUS));
    rect.setAttribute('ry', String(BORDER_RADIUS));
    rect.setAttribute('fill', style?.fillColor || defaultFill);
    rect.setAttribute('stroke', style?.borderColor || style?.borderLineColor || defaultBorderColor);
    rect.setAttribute('stroke-width', String(style?.borderWidth || defaultBorderWidth));
    rect.setAttribute('stroke-dasharray', '4 2'); // 虚线边框，更柔和
    group.appendChild(rect);

    // 标题放在边界框上方，不占用内部空间
    if (boundary.title) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(rectX + 8));
      text.setAttribute('y', String(rectY - 6)); // 放在框上方
      text.setAttribute('font-size', '11');
      text.setAttribute('font-weight', '500');
      text.setAttribute('fill', style?.textColor || defaultBorderColor);
      text.setAttribute('font-family', theme.nodeDefaults.fontFamily);
      text.textContent = boundary.title;
      group.appendChild(text);
    }

    parent.appendChild(group);
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  let r: number, g: number, b: number;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function findLayoutNodesByIds(root: LayoutNode, ids: string[]): LayoutNode[] {
  const idSet = new Set(ids);
  const result: LayoutNode[] = [];

  function traverse(node: LayoutNode): void {
    if (idSet.has(node.id)) {
      result.push(node);
    }
    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(root);
  return result;
}
