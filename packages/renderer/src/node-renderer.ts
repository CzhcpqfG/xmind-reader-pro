import type { LayoutNode, MindMapNode, RichTextSegment, ImageData } from '@xmind-reader/core';
import type { ThemeConfig, RendererState } from './types';
import { getMarkerEmoji } from '@xmind-reader/core';

interface NodeCallbacks {
  onClick: (node: LayoutNode) => void;
  onHover: (node: LayoutNode | null) => void;
  onCollapseToggle: (nodeId: string) => void;
  onImageClick?: (image: ImageData) => void;
}

function bufferToDataUrl(image: ImageData): string {
  if (!image.buffer) return '';
  const bytes = new Uint8Array(image.buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  const base64 = btoa(binary);
  const mediaType = image.mediaType || 'image/png';
  return `data:${mediaType};base64,${base64}`;
}

function getThemeStyleForDepth(depth: number, theme: ThemeConfig) {
  if (depth === 0) return theme.rootDefaults;
  if (depth === 1) return theme.nodeDefaults; // mainTopic 映射到 nodeDefaults（在 theme 映射时已处理）
  return theme.nodeDefaults;
}

export function renderNode(
  parent: SVGGElement,
  layoutNode: LayoutNode,
  theme: ThemeConfig,
  state: RendererState,
  callbacks: NodeCallbacks
): void {
  const { data, x, y, width, height, depth, children } = layoutNode;
  const isRoot = depth === 0;
  const style = getThemeStyleForDepth(depth, theme);
  const fontSize = data.style?.fontSize || style.fontSize;

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.classList.add('mindmap-node');
  group.setAttribute('data-node-id', data.id);
  group.setAttribute('transform', `translate(${x}, ${y})`);

  // 计算图片区域高度
  const hasImage = data.image?.buffer;
  const imgHeight = hasImage ? 80 : 0;
  const imgPadding = hasImage ? 8 : 0;
  const textAreaHeight = height - imgHeight - imgPadding;

  // Shadow filter (Apple-style soft shadow)
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const shadowFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  shadowFilter.setAttribute('id', `shadow-${data.id}`);
  shadowFilter.setAttribute('x', '-20%');
  shadowFilter.setAttribute('y', '-20%');
  shadowFilter.setAttribute('width', '140%');
  shadowFilter.setAttribute('height', '140%');
  shadowFilter.innerHTML = `
    <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="rgba(0,0,0,0.06)"/>
    <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.04)"/>
  `;
  defs.appendChild(shadowFilter);
  group.appendChild(defs);

  // Background rect
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', String(width));
  rect.setAttribute('height', String(height));
  rect.setAttribute('rx', String(style.borderRadius));
  rect.setAttribute('ry', String(style.borderRadius));
  rect.setAttribute('fill', data.style?.fillColor || style.fillColor);
  rect.setAttribute('stroke', data.style?.borderColor || style.borderColor);
  rect.setAttribute('stroke-width', String(data.style?.borderWidth || style.borderWidth));
  rect.setAttribute('filter', `url(#shadow-${data.id})`);
  group.appendChild(rect);

  // Build text content - rich text or plain text
  const textColor = data.style?.textColor || style.textColor;
  const textDecoration = data.style?.textDecoration || '';
  const fontFamily = data.style?.fontFamily || style.fontFamily;
  const textAlign = data.style?.textAlign || 'center';

  // Title text - 使用 foreignObject，宽度自适应节点宽度
  const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  fo.setAttribute('x', '0');
  fo.setAttribute('y', '0');
  fo.setAttribute('width', String(width));
  fo.setAttribute('height', String(textAreaHeight));

  const div = document.createElement('div');
  div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  div.style.cssText = `
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: ${textAlign};
    font-size: ${fontSize}px;
    font-family: ${fontFamily};
    font-weight: ${isRoot ? 'bold' : 'normal'};
    color: ${textColor};
    line-height: 1.4;
    word-break: break-word;
    overflow-wrap: break-word;
    overflow: visible;
    padding: 4px 8px;
    box-sizing: border-box;
    user-select: text;
    -webkit-user-select: text;
    cursor: text;
    ${textDecoration ? `text-decoration: ${textDecoration};` : ''}
  `;

  // Rich text rendering with styled segments
  if (data.richTextSegments && data.richTextSegments.length > 0) {
    renderRichText(div, data.richTextSegments, fontSize, fontFamily, isRoot);
  } else {
    div.textContent = data.title;
  }

  // 阻止文本选区拖拽干扰画布平移
  div.addEventListener('mousedown', (e) => e.stopPropagation());

  fo.appendChild(div);
  group.appendChild(fo);

  // Image rendering
  if (hasImage && data.image!.buffer) {
    const imgDataUrl = bufferToDataUrl(data.image!);
    const imgDisplayWidth = Math.min(data.image!.width || width - 16, width - 16);
    const imgDisplayHeight = Math.min(data.image!.height || 60, imgHeight - 4);

    const imgEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    imgEl.setAttribute('href', imgDataUrl);
    imgEl.setAttribute('x', String((width - imgDisplayWidth) / 2));
    imgEl.setAttribute('y', String(textAreaHeight + imgPadding / 2));
    imgEl.setAttribute('width', String(imgDisplayWidth));
    imgEl.setAttribute('height', String(imgDisplayHeight));
    imgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    imgEl.style.cursor = 'zoom-in';
    imgEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (callbacks.onImageClick && data.image) {
        callbacks.onImageClick(data.image);
      }
    });
    group.appendChild(imgEl);
  }

  // Markers (emoji indicators) - rendered above text, inside foreignObject area
  if (data.markers.length > 0) {
    const markerText = data.markers.map(m => getMarkerEmoji(m.markerId)).filter(Boolean).join(' ');
    if (markerText) {
      const markerFo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      markerFo.setAttribute('x', '0');
      markerFo.setAttribute('y', '0');
      markerFo.setAttribute('width', String(width));
      markerFo.setAttribute('height', '16');
      const markerDiv = document.createElement('div');
      markerDiv.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      markerDiv.style.cssText = `
        font-size: 11px;
        text-align: center;
        line-height: 16px;
        overflow: hidden;
      `;
      markerDiv.textContent = markerText;
      markerFo.appendChild(markerDiv);
      group.appendChild(markerFo);
    }
  }

  // Note indicator
  if (data.notes) {
    const noteIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    noteIcon.setAttribute('x', String(width - 16));
    noteIcon.setAttribute('y', String(height - 6));
    noteIcon.setAttribute('font-size', '10');
    noteIcon.setAttribute('fill', '#8E8E93');
    noteIcon.textContent = '\u{1F4DD}';
    group.appendChild(noteIcon);
  }

  // Link indicator
  if (data.href) {
    const linkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    linkIcon.setAttribute('x', String(width - 16));
    linkIcon.setAttribute('y', String(14));
    linkIcon.setAttribute('font-size', '10');
    linkIcon.setAttribute('fill', '#0A84FF');
    linkIcon.textContent = '\u{1F517}';
    group.appendChild(linkIcon);
  }

  // Labels rendering (pill style)
  if (data.labels && data.labels.length > 0) {
    const labelsText = data.labels.join(', ');
    const labelFo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    labelFo.setAttribute('x', '0');
    labelFo.setAttribute('y', String(height + 4));
    labelFo.setAttribute('width', String(width));
    labelFo.setAttribute('height', '20');
    const labelDiv = document.createElement('div');
    labelDiv.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    labelDiv.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 500;
      color: #636366;
      background: #E5E5EA;
      border-radius: 10px;
      padding: 2px 8px;
      line-height: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0 auto;
      width: fit-content;
      max-width: 100%;
    `;
    labelDiv.textContent = labelsText;
    labelFo.appendChild(labelDiv);
    group.appendChild(labelFo);
  }

  // Collapse toggle (if has children in original data or is collapsed)
  const hasOriginalChildren = data.children.length > 0;
  const isCollapsed = state.collapsedNodeIds.has(data.id);
  if (hasOriginalChildren || isCollapsed) {
    const toggleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    toggleGroup.classList.add('collapse-toggle');
    const toggleX = layoutNode.direction === 'left' ? -12 : width + 2;
    const toggleY = height / 2;

    const toggleCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    toggleCircle.setAttribute('cx', String(toggleX));
    toggleCircle.setAttribute('cy', String(toggleY));
    toggleCircle.setAttribute('r', '8');
    toggleCircle.setAttribute('fill', '#FFFFFF');
    toggleCircle.setAttribute('stroke', '#C7C7CC');
    toggleCircle.setAttribute('stroke-width', '1');
    toggleGroup.appendChild(toggleCircle);

    const toggleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    toggleText.setAttribute('x', String(toggleX));
    toggleText.setAttribute('y', String(toggleY));
    toggleText.setAttribute('text-anchor', 'middle');
    toggleText.setAttribute('dominant-baseline', 'central');
    toggleText.setAttribute('font-size', '10');
    toggleText.setAttribute('fill', '#636366');
    toggleText.textContent = isCollapsed ? '+' : '\u2212';
    toggleGroup.appendChild(toggleText);

    toggleGroup.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onCollapseToggle(data.id);
    });

    group.appendChild(toggleGroup);
  }

  // Event handlers
  group.addEventListener('click', () => callbacks.onClick(layoutNode));
  group.addEventListener('mouseenter', () => callbacks.onHover(layoutNode));
  group.addEventListener('mouseleave', () => callbacks.onHover(null));

  parent.appendChild(group);
}

function renderRichText(
  parent: HTMLDivElement,
  segments: RichTextSegment[],
  baseFontSize: number,
  fontFamily: string,
  isRoot: boolean
): void {
  for (const seg of segments) {
    if (!seg.text) continue;
    const span = document.createElement('span');
    span.textContent = seg.text;
    const styles: string[] = [];
    if (seg.bold || isRoot) styles.push('font-weight: bold');
    if (seg.italic) styles.push('font-style: italic');
    if (seg.color) styles.push(`color: ${seg.color}`);
    if (seg.underline) styles.push('text-decoration: underline');
    if (seg.strikeThrough) styles.push('text-decoration: line-through');
    if (seg.underline && seg.strikeThrough) styles.push('text-decoration: underline line-through');
    if (seg.fontSize) styles.push(`font-size: ${seg.fontSize}px`);
    if (seg.fontFamily) styles.push(`font-family: ${seg.fontFamily}`);
    if (styles.length > 0) {
      span.style.cssText = styles.join('; ');
    }
    parent.appendChild(span);
  }
}
