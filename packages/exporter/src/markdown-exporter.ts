import type { MindMapNode, MindMapData } from '@xmind-reader/core';

export function exportToMarkdown(rootNode: MindMapNode): string;
export function exportToMarkdown(data: MindMapData): string;
export function exportToMarkdown(input: MindMapNode | MindMapData): string {
  if ('sheets' in input) {
    // MindMapData 输入：导出所有 sheet
    const lines: string[] = [];
    for (let i = 0; i < input.sheets.length; i++) {
      const sheet = input.sheets[i];
      if (i > 0) lines.push('', '\n---\n', '');
      lines.push(`# ${sheet.title || `Sheet ${i + 1}`}`, '');
      renderNodeMarkdown(sheet.rootTopic, 0, lines);
    }
    return lines.join('\n');
  }
  // 单个节点输入
  const lines: string[] = [];
  renderNodeMarkdown(input, 0, lines);
  return lines.join('\n');
}

function renderNodeMarkdown(node: MindMapNode, depth: number, lines: string[]): void {
  const indent = '  '.repeat(depth);
  const prefix = depth === 0 ? '' : depth === 1 ? '## ' : depth === 2 ? '### ' : '- ';
  lines.push(`${indent}${prefix}${node.title}`);

  if (node.href) {
    lines.push(`${indent}  [链接](${node.href})`);
  }

  if (node.labels && node.labels.length > 0) {
    lines.push(`${indent}  > 标签: ${node.labels.join(', ')}`);
  }

  if (node.markers && node.markers.length > 0) {
    const markerIds = node.markers.map((m: { markerId: string }) => m.markerId).join(', ');
    lines.push(`${indent}  > 标记: ${markerIds}`);
  }

  if (node.notes?.plain) {
    const noteLines = node.notes.plain.split('\n');
    for (const line of noteLines) {
      lines.push(`${indent}  > ${line}`);
    }
  }

  if (node.image?.src) {
    lines.push(`${indent}  ![图片](${node.image.src})`);
  }

  for (const child of node.children) {
    renderNodeMarkdown(child, depth + 1, lines);
  }
}
