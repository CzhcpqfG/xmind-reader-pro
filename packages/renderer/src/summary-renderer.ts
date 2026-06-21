import type { LayoutNode, Summary, ImageData, SummaryLayout } from '@xmind-reader/core';
import type { ThemeConfig } from './types';

const CONTENT_MAX_WIDTH = 320;
const IMAGE_MAX_HEIGHT = 160;

/**
 * 渲染 XMind 概要（大括号）为 SVG 元素
 *
 * 现在使用布局阶段预计算的 summaryLayouts，不再做碰撞检测
 */
export function renderSummaries(
  parent: SVGGElement,
  layoutRoot: LayoutNode,
  summaries: Summary[],
  summaryLayouts: SummaryLayout[] | undefined,
  theme: ThemeConfig
): void {
  if (!summaryLayouts || summaryLayouts.length === 0) return;

  const layoutMap = new Map(summaryLayouts.map(sl => [sl.id, sl]));

  for (const summary of summaries) {
    const sl = layoutMap.get(summary.id);
    if (!sl) continue;

    // 括号颜色：优先使用 theme.summaryLineColor，其次是 theme.connectorColor
    const strokeColor = theme.summaryLineColor || theme.connectorColor;

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('summary');
    group.setAttribute('data-summary-id', summary.id);

    // 绘制大括号
    const bracketPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    bracketPath.setAttribute('d', sl.bracketPath);
    bracketPath.setAttribute('stroke', strokeColor);
    bracketPath.setAttribute('stroke-width', String(theme.summaryLineWidth || 2));
    bracketPath.setAttribute('fill', 'none');
    bracketPath.setAttribute('stroke-linejoin', 'round');
    group.appendChild(bracketPath);

    // 概要内容：标题 + 图片 + 子内容
    const hasTitle = !!summary.title;
    const hasImage = !!summary.image?.buffer;
    const hasInnerChildren = !!(summary.children && summary.children.length > 0);

    if (hasTitle || hasImage || hasInnerChildren) {
      const titleColor = summary.style?.textColor || theme.nodeDefaults.textColor;
      const titleFontSize = summary.style?.fontSize || theme.nodeDefaults.fontSize;
      const { width: contentWidth, height: contentHeight } = computeSummaryContentSize(summary);

      const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      fo.setAttribute('x', String(sl.contentX));
      fo.setAttribute('y', String(sl.contentY));
      fo.setAttribute('width', String(contentWidth));
      fo.setAttribute('height', String(contentHeight));

      const container = document.createElement('div');
      container.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      container.style.cssText = `
        font-size: ${titleFontSize}px;
        font-family: ${theme.nodeDefaults.fontFamily};
        color: ${titleColor};
        line-height: 1.4;
        word-break: break-word;
        overflow-wrap: break-word;
        padding: 6px 8px;
        max-width: ${contentWidth}px;
        ${sl.direction === 'right' ? 'text-align: left;' : 'text-align: right;'}
      `;

      if (hasTitle) {
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = `
          font-size: ${titleFontSize}px;
          font-weight: 600;
          color: ${titleColor};
          margin-bottom: ${(hasImage || hasInnerChildren) ? '6px' : '0'};
          white-space: pre-wrap;
        `;
        titleDiv.textContent = summary.title || '';
        container.appendChild(titleDiv);
      }

      if (hasImage && summary.image?.buffer) {
        const imgDataUrl = bufferToDataUrl(summary.image);
        const img = document.createElement('img');
        img.src = imgDataUrl;
        img.style.cssText = `
          max-width: 100%;
          max-height: ${IMAGE_MAX_HEIGHT}px;
          display: block;
          margin: ${hasInnerChildren ? '0 0 6px 0' : '0'};
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 4px;
        `;
        container.appendChild(img);
      }

      if (hasInnerChildren && summary.children) {
        const childList = document.createElement('div');
        childList.style.cssText = `
          font-size: ${Math.max(11, titleFontSize - 2)}px;
          color: ${titleColor};
          opacity: 0.85;
          margin-top: 4px;
        `;
        for (const child of summary.children) {
          const item = document.createElement('div');
          item.style.cssText = `
            padding: 2px 0;
            display: flex;
            align-items: center;
            gap: 4px;
          `;
          if (child.image?.buffer) {
            const childImgDataUrl = bufferToDataUrl(child.image);
            const childImg = document.createElement('img');
            childImg.src = childImgDataUrl;
            childImg.style.cssText = `
              max-width: 60px;
              max-height: 40px;
              flex-shrink: 0;
              border-radius: 3px;
            `;
            item.appendChild(childImg);
          }
          const textSpan = document.createElement('span');
          textSpan.textContent = child.title || '';
          textSpan.style.cssText = 'flex: 1;';
          item.appendChild(textSpan);
          childList.appendChild(item);
        }
        container.appendChild(childList);
      }

      fo.appendChild(container);
      group.appendChild(fo);
    }

    parent.appendChild(group);
  }
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
      : 180;
    imageHeight = summary.image.height
      ? Math.min(summary.image.height, IMAGE_MAX_HEIGHT)
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

  const contentWidth = Math.max(180,
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
