import type { MindMapNode } from '@xmind-reader/core';
import type { ThemeConfig } from './types';

/**
 * 用浏览器 DOM 实测所有节点的文本尺寸
 * 先测自然宽度，只在超限时才换行
 */
export function measureAllNodeSizes(
  root: MindMapNode,
  theme: ThemeConfig
): Map<string, { width: number; height: number }> {
  const sizeMap = new Map<string, { width: number; height: number }>();

  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: -9999px;
    visibility: hidden;
    pointer-events: none;
  `;
  document.body.appendChild(container);

  measureNodeRecursive(root, 0, container, theme, sizeMap);

  document.body.removeChild(container);

  return sizeMap;
}

function measureNodeRecursive(
  node: MindMapNode,
  level: number,
  container: HTMLDivElement,
  theme: ThemeConfig,
  sizeMap: Map<string, { width: number; height: number }>
): void {
  const size = measureSingleNode(node, level, container, theme);
  sizeMap.set(node.id, size);

  for (const child of node.children) {
    measureNodeRecursive(child, level + 1, container, theme, sizeMap);
  }
  if (node.detachedChildren) {
    for (const child of node.detachedChildren) {
      measureNodeRecursive(child, level + 1, container, theme, sizeMap);
    }
  }
}

function measureSingleNode(
  node: MindMapNode,
  level: number,
  container: HTMLDivElement,
  theme: ThemeConfig
): { width: number; height: number } {
  const isRoot = level === 0;
  const style = isRoot ? theme.rootDefaults : theme.nodeDefaults;
  const fontSize = node.style?.fontSize || style.fontSize;
  const paddingH = isRoot ? 40 : 24;
  const paddingV = isRoot ? 20 : 14;

  // Use customWidth if specified
  if (node.customWidth) {
    const customTextWidth = node.customWidth - paddingH;
    // Measure with custom width
    const wrapDiv = document.createElement('div');
    wrapDiv.style.cssText = `
      position: absolute;
      width: ${customTextWidth}px;
      font-size: ${fontSize}px;
      font-family: ${style.fontFamily};
      font-weight: ${isRoot ? 'bold' : 'normal'};
      line-height: 1.4;
      word-break: break-word;
      white-space: pre-wrap;
      padding: 2px 4px;
      box-sizing: border-box;
    `;
    wrapDiv.textContent = node.title;
    container.appendChild(wrapDiv);
    const wrapRect = wrapDiv.getBoundingClientRect();
    let resultHeight = Math.ceil(Math.max(wrapRect.height + paddingV, 30));
    container.removeChild(wrapDiv);
    if (node.image) {
      resultHeight += 88;
    }
    const resultWidth = Math.max(Math.ceil(node.customWidth), node.image ? 160 : 60);
    return { width: resultWidth, height: resultHeight };
  }

  // 节点最大文本宽度限制（按层级递减）
  const maxTextWidths = [280, 220, 200, 180, 160];
  const maxTextWidth = maxTextWidths[Math.min(level, maxTextWidths.length - 1)];

  // Step 1: 测量自然宽度（不限制宽度）
  const div = document.createElement('div');
  div.style.cssText = `
    position: absolute;
    font-size: ${fontSize}px;
    font-family: ${style.fontFamily};
    font-weight: ${isRoot ? 'bold' : 'normal'};
    line-height: 1.4;
    white-space: nowrap;
    padding: 2px 4px;
    box-sizing: border-box;
  `;
  div.textContent = node.title;
  container.appendChild(div);

  const naturalRect = div.getBoundingClientRect();
  const naturalWidth = naturalRect.width;
  container.removeChild(div);

  // Step 2: 判断是否需要换行
  const needsWrap = naturalWidth > maxTextWidth;

  let textWidth: number;
  let textHeight: number;

  if (needsWrap) {
    // 需要换行：限制宽度重新测量高度
    const wrapDiv = document.createElement('div');
    wrapDiv.style.cssText = `
      position: absolute;
      width: ${maxTextWidth}px;
      font-size: ${fontSize}px;
      font-family: ${style.fontFamily};
      font-weight: ${isRoot ? 'bold' : 'normal'};
      line-height: 1.4;
      word-break: break-word;
      white-space: pre-wrap;
      padding: 2px 4px;
      box-sizing: border-box;
    `;
    wrapDiv.textContent = node.title;
    container.appendChild(wrapDiv);

    const wrapRect = wrapDiv.getBoundingClientRect();
    textWidth = wrapRect.width;
    textHeight = wrapRect.height;
    container.removeChild(wrapDiv);
  } else {
    // 不换行：使用自然尺寸
    textWidth = naturalWidth;
    textHeight = naturalRect.height;
  }

  let nodeWidth = Math.max(textWidth + paddingH, 60);
  let nodeHeight = Math.max(textHeight + paddingV, 30);

  // 图片节点额外空间
  if (node.image) {
    const imgHeight = 80;
    nodeHeight += imgHeight + 8;
    nodeWidth = Math.max(nodeWidth, 160);
  }

  return { width: Math.ceil(nodeWidth), height: Math.ceil(nodeHeight) };
}
