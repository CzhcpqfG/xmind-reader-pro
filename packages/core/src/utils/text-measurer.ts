const DEFAULT_FONT = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

// Fallback: Node.js 环境没有 OffscreenCanvas，使用字符估算
const isBrowser = typeof OffscreenCanvas !== 'undefined';

let canvas: OffscreenCanvas | null = null;

function getCanvas(): OffscreenCanvas | null {
  if (!isBrowser) return null;
  if (!canvas) {
    canvas = new OffscreenCanvas(1000, 100);
  }
  return canvas;
}

/**
 * 判断字符是否为 CJK（中日韩）字符
 * CJK 字符宽度约为英文的 2 倍
 */
function isCJK(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4E00 && code <= 0x9FFF) ||   // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4DBF) ||   // CJK Extension A
    (code >= 0x3000 && code <= 0x303F) ||   // CJK Symbols and Punctuation
    (code >= 0xFF00 && code <= 0xFFEF) ||   // Fullwidth Forms
    (code >= 0x2E80 && code <= 0x2EFF) ||   // CJK Radicals Supplement
    (code >= 0xF900 && code <= 0xFAFF) ||   // CJK Compatibility Ideographs
    (code >= 0xFE30 && code <= 0xFE4F)      // CJK Compatibility Forms
  );
}

/**
 * 估算文本像素宽度
 * CJK 字符按 2 倍英文字符宽度计算
 */
function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    if (isCJK(char)) {
      width += fontSize * 1.05; // CJK 字符约等于字号宽度
    } else {
      width += fontSize * 0.55; // 英文字符约 0.55 倍
    }
  }
  return width;
}

export function measureText(text: string, font?: string): { width: number; height: number } {
  const ctx = getCanvas()?.getContext('2d');
  const fontSize = parseInt(font?.match(/\d+px/)?.[0] || '14');

  if (!ctx) {
    // Node.js fallback: 使用 CJK 感知的字符估算
    return {
      width: estimateTextWidth(text, fontSize),
      height: fontSize * 1.4,
    };
  }
  ctx.font = font || DEFAULT_FONT;
  const metrics = ctx.measureText(text);
  return {
    width: metrics.width,
    height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || fontSize * 1.4,
  };
}

/**
 * 节点最大宽度限制（按层级）
 * 超过此宽度的文本将换行显示
 */
const MAX_NODE_WIDTH = [300, 240, 200, 180, 160];

export function estimateNodeSize(
  title: string,
  level: number,
  hasImage?: boolean,
  imageWidth?: number,
  imageHeight?: number,
  customWidth?: number
): { width: number; height: number } {
  const fontSizes = [20, 16, 14, 13, 12];
  const fontSize = fontSizes[Math.min(level, fontSizes.length - 1)];
  const font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const maxWidth = MAX_NODE_WIDTH[Math.min(level, MAX_NODE_WIDTH.length - 1)];
  const paddingH = level === 0 ? 40 : 24;
  const paddingV = level === 0 ? 20 : 14;

  const measured = measureText(title, font);
  const textWidth = measured.width;

  let nodeWidth: number;
  let nodeHeight: number;
  let lines = 1;

  if (textWidth + paddingH <= maxWidth) {
    // 单行
    nodeWidth = Math.max(textWidth + paddingH, 60);
    nodeHeight = Math.max(measured.height + paddingV, 30);
  } else {
    // 需要换行
    nodeWidth = maxWidth;
    const charsPerLine = Math.floor((maxWidth - paddingH) / (fontSize * 0.7));
    lines = Math.ceil(title.length / Math.max(charsPerLine, 1));
    nodeHeight = Math.max(lines * fontSize * 1.5 + paddingV, 30);
  }

  // 应用自定义宽度
  if (customWidth && customWidth > 0) {
    nodeWidth = customWidth;
    // 重新计算换行后的高度
    if (textWidth + paddingH > nodeWidth) {
      const charsPerLine = Math.floor((nodeWidth - paddingH) / (fontSize * 0.7));
      lines = Math.ceil(title.length / Math.max(charsPerLine, 1));
      nodeHeight = Math.max(lines * fontSize * 1.5 + paddingV, 30);
    }
  }

  // 图片节点：根据原始尺寸估算显示尺寸（保持比例）
  if (hasImage) {
    if (imageWidth && imageHeight && imageWidth > 0 && imageHeight > 0) {
      const imgDisplayWidth = Math.min(imageWidth, nodeWidth - 16);
      const imgDisplayHeight = imgDisplayWidth * (imageHeight / imageWidth);
      nodeHeight += imgDisplayHeight + 8;
      nodeWidth = Math.max(nodeWidth, imgDisplayWidth + 16);
    } else {
      const imgHeight = 80;
      nodeHeight += imgHeight + 8;
      nodeWidth = Math.max(nodeWidth, 160);
    }
  }

  return { width: nodeWidth, height: nodeHeight };
}
