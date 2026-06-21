import type { MindMapData, ImageData, MindMapNode } from '../types/index';
import { readZipFile } from '../zip-reader';
import { parseJSONFormat } from '../xmind-json-parser';
import { parseXMLFormat } from '../xmind-xml-parser';

export async function parseXMind(buffer: ArrayBuffer): Promise<MindMapData> {
  const zipContent = await readZipFile(buffer);

  let data: MindMapData;
  if (zipContent.format === 'json') {
    data = parseJSONFormat(
      zipContent.contentJson!,
      zipContent.metadataJson
    );
  } else {
    data = parseXMLFormat(
      zipContent.contentXml!,
      zipContent.stylesXml
    );
  }

  // Resolve image data from ZIP attachments - 支持多种位置
  resolveImageData(data, zipContent.attachments);

  return data;
}

function resolveImageData(data: MindMapData, attachments: Map<string, ArrayBuffer>): void {
  for (const sheet of data.sheets) {
    resolveNodeImages(sheet.rootTopic, attachments);
    // 处理 sheet 级别的 summaries/boundaries 中的图片
    if (sheet.summaries) {
      for (const s of sheet.summaries) {
        resolveSummaryImages(s, attachments);
      }
    }
  }
}

function resolveNodeImages(node: MindMapNode, attachments: Map<string, ArrayBuffer>): void {
  // 1. 解析标准 image 字段
  if (node.image?.src) {
    const buffer = findAttachment(node.image.src, attachments);
    if (buffer) {
      node.image.buffer = buffer;
      node.image.mediaType = getMediaType(node.image.src);
    }
  }

  // 2. 解析 notes HTML 中嵌入的图片引用
  if (node.noteImageRefs && node.noteImageRefs.length > 0) {
    node.notesImages = [];
    for (const ref of node.noteImageRefs) {
      const buffer = findAttachment(ref, attachments);
      if (buffer) {
        const mediaType = getMediaType(ref);
        const cleanSrc = ref.startsWith('xap:') ? ref.substring(4) : ref;
        node.notesImages.push({
          src: cleanSrc,
          buffer,
          mediaType,
        });
      }
    }
    if (node.notesImages.length === 0) {
      delete node.notesImages;
    }
  }

  for (const child of node.children) {
    resolveNodeImages(child, attachments);
  }
  if (node.detachedChildren) {
    for (const child of node.detachedChildren) {
      resolveNodeImages(child, attachments);
    }
  }

  // 3. 解析 summary 内容节点中的图片（真实 XMind 中图片可能位于 children.summary）
  const summaryContents = (node as any).__summaryContents as Map<string, MindMapNode> | undefined;
  if (summaryContents) {
    for (const summaryNode of summaryContents.values()) {
      resolveNodeImages(summaryNode, attachments);
    }
  }
}

/** 解析 Summary 节点中包含的图片：
 *  - Summary 自身的 image
 *  - Summary.children[] 中嵌套的图片（递归）
 */
function resolveSummaryImages(summary: any, attachments: Map<string, ArrayBuffer>): void {
  if (summary.image?.src) {
    const buffer = findAttachment(summary.image.src, attachments);
    if (buffer) {
      summary.image.buffer = buffer;
      summary.image.mediaType = getMediaType(summary.image.src);
    }
  }
  if (summary.children && summary.children.length > 0) {
    for (const child of summary.children) {
      resolveNodeImages(child, attachments);
    }
  }
}

/** 智能匹配附件：尝试多种 src 变体 */
function findAttachment(src: string, attachments: Map<string, ArrayBuffer>): ArrayBuffer | undefined {
  // src 可能是: "xap:attachments/xxx.png" 或 "xap:resources/xxx.png" 或 "attachments/xxx.png" 等
  const candidates: string[] = [];

  // 原样
  candidates.push(src);

  // 去掉 xap: 前缀
  if (src.startsWith('xap:')) {
    candidates.push(src.substring(4));
  } else {
    candidates.push(`xap:${src}`);
  }

  // 按候选列表精确查找
  for (const candidate of candidates) {
    if (attachments.has(candidate)) {
      return attachments.get(candidate);
    }
  }

  // 回退：按文件名在所有附件中模糊匹配
  const fileName = src.split('/').pop() || src;
  for (const [path, data] of attachments.entries()) {
    if (path.endsWith(fileName) || path === src || path === `xap:${src}`) {
      return data;
    }
  }

  return undefined;
}

function getMediaType(src: string): string {
  const ext = src.split('.').pop()?.toLowerCase().split('?')[0];
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'bmp') return 'image/bmp';
  return 'image/png';
}
