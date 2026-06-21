import type {
  XMindFile,
  XMindTopic,
  MindMapData,
  MindMapNode,
  Sheet,
  Relationship,
  MarkerInfo,
  Metadata,
  Summary,
  Boundary,
  Comment,
  RichTextSegment,
  NodeStyle,
  ParsedTheme,
} from './types/index';
import { StructureClass, NodeShape } from './types/index';

export function parseJSONFormat(contentJson: string, metadataJson?: string): MindMapData {
  const sheets: XMindFile[] = JSON.parse(contentJson);

  const parsedSheets: Sheet[] = sheets.map((sheet, index) => {
    const rootTopic = parseTopic(sheet.rootTopic, 0);

    // 收集所有 topic 级别 summaries/boundaries
    const collectedSummaries: Summary[] = [];
    collectSummaries(rootTopic, collectedSummaries);
    if (sheet.summaries && sheet.summaries.length > 0) {
      for (const s of sheet.summaries) {
        collectedSummaries.push(parseSheetLevelSummary(s));
      }
    }

    const collectedBoundaries: Boundary[] = [];
    collectBoundaries(rootTopic, collectedBoundaries);
    if (sheet.boundaries && sheet.boundaries.length > 0) {
      for (const b of sheet.boundaries) {
        collectedBoundaries.push(parseSheetLevelBoundary(b));
      }
    }

    return {
      id: sheet.id || `sheet-${index}`,
      title: sheet.title || `画布 ${index + 1}`,
      rootTopic,
      structureClass: normalizeStructureClass(sheet.structureClass || sheet.class || (rootTopic.structureClass as string) || ''),
      relationships: parseRelationships(sheet.relationships),
      summaries: collectedSummaries.length > 0 ? collectedSummaries : undefined,
      boundaries: collectedBoundaries.length > 0 ? collectedBoundaries : undefined,
      theme: parseTheme((sheet as any).theme),
    };
  });

  let metadata: Metadata | undefined;
  if (metadataJson) {
    try {
      const meta = JSON.parse(metadataJson);
      metadata = {
        creator: meta.creator,
        create_time: meta.createTime,
        last_modifier: meta.lastModifier,
        last_modified_time: meta.lastModifiedTime,
      };
    } catch {}
  }

  return { sheets: parsedSheets, metadata };
}

/** 递归收集每个 topic 上定义的 summaries（合并 content 节点） */
function collectSummaries(node: MindMapNode, out: Summary[]): void {
  const bracketInfos = (node as any).__summaryBrackets as Array<{ id: string; range: string; topicId: string }> | undefined;
  const contentMap = (node as any).__summaryContents as Map<string, MindMapNode> | undefined;
  const siblingList = node.children;

  if (bracketInfos && siblingList) {
    for (const bracket of bracketInfos) {
      const ids = parseRangeToIds(bracket.range, siblingList);
      const content = contentMap?.get(bracket.topicId);
      out.push({
        id: bracket.id,
        title: content?.title,
        range: ids,
        style: content?.style,
        image: content?.image,
        children: content?.children && content.children.length > 0 ? content.children : undefined,
      });
    }
  }

  for (const child of node.children) {
    collectSummaries(child, out);
  }
  if (node.detachedChildren) {
    for (const child of node.detachedChildren) {
      collectSummaries(child, out);
    }
  }
}

function collectBoundaries(node: MindMapNode, out: Boundary[]): void {
  const bracketInfos = (node as any).__boundaryBrackets as Array<{ id: string; range: string; style?: NodeStyle }> | undefined;
  const siblingList = node.children;

  if (bracketInfos && siblingList) {
    for (const bracket of bracketInfos) {
      const ids = parseRangeToIds(bracket.range, siblingList);
      out.push({
        id: bracket.id,
        range: ids,
        style: bracket.style,
      });
    }
  }

  for (const child of node.children) {
    collectBoundaries(child, out);
  }
  if (node.detachedChildren) {
    for (const child of node.detachedChildren) {
      collectBoundaries(child, out);
    }
  }
}

/** 将 XMind 的 range 元组字符串 "(startIdx,endIdx)" 转换为兄弟节点 ID 列表
 *  注意：XMind 中 range 是闭合区间，包含两端
 */
function parseRangeToIds(range: string | undefined, siblings: MindMapNode[]): string[] {
  if (!range || typeof range !== 'string') return [];
  // 匹配 (start,end) 或 (start)
  const tupleMatch = range.match(/\(\s*(\d+)\s*,?\s*(\d+)?\s*\)/);
  if (tupleMatch) {
    const start = parseInt(tupleMatch[1], 10);
    const end = tupleMatch[2] != null ? parseInt(tupleMatch[2], 10) : start;
    const ids: string[] = [];
    for (let i = start; i <= end && i < siblings.length; i++) {
      if (siblings[i]?.id) ids.push(siblings[i].id);
    }
    return ids;
  }
  return range ? [range] : [];
}

/** Sheet 级别的 summary（rootTopic 之外） */
function parseSheetLevelSummary(s: any): Summary {
  return {
    id: s.id,
    title: s.title,
    range: Array.isArray(s.range) ? s.range : [],
    style: parseTopicStyle(s.style),
    image: s.image ? { src: resolveImageSrc(s.image.src), width: s.image.width, height: s.image.height } : undefined,
    children: s.children?.attached?.map((c: XMindTopic) => parseTopic(c, 999)),
  };
}

function parseSheetLevelBoundary(b: any): Boundary {
  return {
    id: b.id,
    title: b.title,
    range: Array.isArray(b.range) ? b.range : [],
    style: parseTopicStyle(b.style),
  };
}

function parseTopic(topic: XMindTopic, level: number): MindMapNode {
  let title = topic.title || '';
  let richTextSegments: RichTextSegment[] | undefined;

  // attributedTitle contains the full rich text with styles
  if (topic.attributedTitle && Array.isArray(topic.attributedTitle) && topic.attributedTitle.length > 0) {
    title = topic.attributedTitle.map(seg => seg.text || '').join('');
    richTextSegments = topic.attributedTitle.map(seg => ({
      text: seg.text || '',
      bold: seg.bold,
      italic: seg.italic,
      underline: seg.underline,
      strikeThrough: seg.strikeThrough,
      color: seg.color,
      fontSize: seg.fontSize,
      fontFamily: seg.fontFamily,
      href: seg.href,
    })).filter(seg => seg.text.length > 0);
    // If all segments have no special styling, don't bother storing them
    const hasAnyStyle = richTextSegments.some(seg =>
      seg.bold || seg.italic || seg.underline || seg.strikeThrough || seg.color || seg.href
    );
    if (!hasAnyStyle) {
      richTextSegments = undefined;
    }
  } else if (!title && topic.text?.text) {
    title = topic.text.text;
  }

  const children: MindMapNode[] = [];
  const detachedChildren: MindMapNode[] = [];

  if (topic.children?.attached) {
    for (const child of topic.children.attached) {
      children.push(parseTopic(child, level + 1));
    }
  }

  if (topic.children?.detached) {
    for (const child of topic.children.detached) {
      detachedChildren.push(parseTopic(child, level + 1));
    }
  }

  const markers: MarkerInfo[] = (topic.markers || []).map(m => parseMarkerId(m.markerId));

  // Parse comments - 支持 author/content/creationTime/time
  let comments: Comment[] | undefined;
  if (topic.comments && topic.comments.length > 0) {
    comments = topic.comments.map(c => ({
      author: c.author || '',
      content: c.content || '',
      time: c.creationTime ? String(c.creationTime) : (c.time || ''),
    }));
  }

  // 解析 notes HTML 中的图片引用
  const noteHtml = topic.notes?.html?.content;
  const noteImageRefs = noteHtml ? extractImageRefsFromHtml(noteHtml) : [];

  const node: MindMapNode = {
    id: topic.id,
    title,
    richText: topic.text?.text,
    richTextSegments,
    labels: topic.labels,
    notes: topic.notes ? {
      plain: topic.notes.plain?.content,
      html: noteHtml,
    } : undefined,
    href: topic.href,
    image: topic.image ? {
      src: resolveImageSrc(topic.image.src),
      width: topic.image.width,
      height: topic.image.height,
    } : undefined,
    markers,
    children,
    detachedChildren: detachedChildren.length > 0 ? detachedChildren : undefined,
    style: parseTopicStyle(topic.style),
    customWidth: topic.customWidth,
    structureClass: topic.structureClass as StructureClass | undefined,
    level,
    comments,
    position: topic.position ? { x: topic.position.x, y: topic.position.y } : undefined,
  };

  // 存储 notes 中引用的图片，渲染时备用
  if (noteImageRefs.length > 0) {
    node.noteImageRefs = noteImageRefs;
  }

  // ★ 关键：真实 XMind 格式中 summary 内容节点数组位于 topic.children.summary
  // （与 topic.children.attached 同级），而 topic.summaries 在 topic 顶级
  // 这里需要把 summary 内容节点保存到一个临时字段，供 collectSummaries 关联
  if (topic.children?.summary && Array.isArray(topic.children.summary) && topic.children.summary.length > 0) {
    const contentMap = new Map<string, MindMapNode>();
    for (const s of topic.children.summary) {
      const contentNode = parseTopic(s, level + 1);
      contentMap.set(contentNode.id, contentNode);
    }
    (node as any).__summaryContents = contentMap;
  }

  // ★ 关键修复：
  // topic.summary[]（单数）= 概要内容节点（含 title/image/children）
  // topic.summaries[]（复数）= 概要括号定义（range 引用兄弟索引，topicId 引用内容节点）
  // 将两者暂存到 node，由 collectSummaries 合并生成最终的 Summary

  if (topic.summary && Array.isArray(topic.summary) && topic.summary.length > 0) {
    const contentMap = new Map<string, MindMapNode>();
    for (const s of topic.summary) {
      // summary 节点当作普通 topic 解析（可含 title/image/children）
      const contentNode = parseTopic(s, level + 1);
      contentMap.set(contentNode.id, contentNode);
    }
    (node as any).__summaryContents = contentMap;
  }

  if (topic.summaries && Array.isArray(topic.summaries) && topic.summaries.length > 0) {
    (node as any).__summaryBrackets = topic.summaries.map(s => ({
      id: s.id,
      range: (s as any).range,
      topicId: (s as any).topicId,
    }));
  }

  if (topic.boundaries && Array.isArray(topic.boundaries) && topic.boundaries.length > 0) {
    (node as any).__boundaryBrackets = topic.boundaries.map(b => ({
      id: b.id,
      range: (b as any).range,
      style: parseTopicStyle(b.style),
    }));
  }

  return node;
}

/** 从 HTML 中提取所有图片引用（xap:、src、xhtml:href 等） */
function extractImageRefsFromHtml(html: string): string[] {
  const refs: string[] = [];
  // 匹配 src="xap:xxx" 或 xhtml:href="xap:xxx"
  const re = /(?:src|xhtml:href)="([^"]+)"/g;
  let match;
  while ((match = re.exec(html)) !== null) {
    refs.push(match[1]);
  }
  return refs;
}

function parseMarkerId(markerId: string): MarkerInfo {
  // Marker IDs are like "priority-1", "task-done", "smiley-smile"
  const parts = markerId.split('-');
  return {
    markerId,
    family: parts[0] || 'unknown',
    index: parseInt(parts[parts.length - 1]) || 0,
  };
}

function parseTopicStyle(style: any): NodeStyle | undefined {
  if (!style?.properties) return undefined;
  const props = style.properties;
  return {
    fillColor: parseColor(props['svg:fill']),
    textColor: parseColor(props['fo:color']),
    borderColor: parseColor(props['border-color']),
    borderWidth: parsePt(props['border-width']),
    fontSize: parsePt(props['fo:font-size'] ?? props['font-size']),
    fontWeight: props['fo:font-weight'] as string | undefined,
    fontStyle: props['fo:font-style'] as string | undefined,
    textDecoration: props['fo:text-decoration'] as string | undefined,
    fillPattern: props['fill-pattern'] as string | undefined,
    borderLineColor: parseColor(props['line-color'] || props['border-line-color']),
    shape: parseShape(props['shape-class']),
    borderRadius: parsePt(props['corner-radius']),
    lineHeight: parsePt(props['line-height']),
    fontFamily: props['fo:font-family'] as string | undefined,
    textAlign: props['fo:text-align'] as 'left' | 'center' | 'right' | undefined,
    lineWidth: parsePt(props['line-width']),
    lineColor: parseColor(props['line-color']),
    linePattern: props['line-pattern'] as string | undefined,
  };
}

function parseTheme(theme: any): ParsedTheme | undefined {
  if (!theme) return undefined;
  const map = theme.map?.properties || {};
  const central = theme.centralTopic?.properties || {};
  const main = theme.mainTopic?.properties || {};
  const sub = theme.subTopic?.properties || {};
  const summary = theme.summary?.properties || {};
  const boundary = theme.boundary?.properties || {};
  const rel = theme.relationship?.properties || {};

  return {
    background: parseColor(map['svg:fill']) || '#ffffff',
    rootDefaults: { ...parseTopicStyle({ properties: central }), fontFamily: central['fo:font-family'], fontSize: parsePt(central['fo:font-size']) },
    mainTopicDefaults: { ...parseTopicStyle({ properties: main }), fontFamily: main['fo:font-family'], fontSize: parsePt(main['fo:font-size']) },
    subTopicDefaults: { ...parseTopicStyle({ properties: sub }), fontFamily: sub['fo:font-family'], fontSize: parsePt(sub['fo:font-size']) },
    summaryLineColor: parseColor(summary['line-color']),
    summaryLineWidth: parsePt(summary['line-width']),
    boundaryFillColor: parseColor(boundary['svg:fill']),
    boundaryLineColor: parseColor(boundary['line-color']),
    connectorColor: parseColor(rel['line-color']) || parseColor(main['line-color']) || '#aaaaaa',
    connectorWidth: parsePt(rel['line-width']),
  };
}

function parsePt(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;
  const match = String(value).match(/^([\d.]+)/);
  return match ? parseFloat(match[1]) : undefined;
}

function parseColor(value: unknown): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  if (value === 'inherited') return undefined;
  // XMind uses #RRGGBBAA, strip alpha if present for simplicity
  if (value.length === 9 && value.startsWith('#')) {
    return value.slice(0, 7);
  }
  return value;
}

function parseShape(shapeClass: unknown): NodeShape | undefined {
  if (!shapeClass || typeof shapeClass !== 'string') return undefined;
  const map: Record<string, NodeShape> = {
    'org.xmind.topicShape.roundedRect': NodeShape.RoundedRect,
    'org.xmind.topicShape.rectangle': NodeShape.Rectangle,
    'org.xmind.topicShape.ellipse': NodeShape.Ellipse,
    'org.xmind.topicShape.diamond': NodeShape.Diamond,
    'org.xmind.topicShape.underline': NodeShape.Underline,
    'org.xmind.topicShape.none': NodeShape.None,
  };
  return map[shapeClass];
}

function parseRelationships(rels?: any[]): Relationship[] {
  if (!rels) return [];
  return rels.map(r => ({
    id: r.id,
    fromId: r.end1Id,
    toId: r.end2Id,
    title: r.title || r.label,
    lineType: r.lineType,
  }));
}

function normalizeStructureClass(cls: string): StructureClass {
  const knownClasses: Record<string, StructureClass> = {
    'org.xmind.ui.logic.right': StructureClass.LogicRight,
    'org.xmind.ui.logic.left': StructureClass.LogicLeft,
    'org.xmind.ui.tree.right': StructureClass.TreeRight,
    'org.xmind.ui.tree.left': StructureClass.TreeLeft,
    'org.xmind.ui.org-chart.normal': StructureClass.OrgChartNormal,
    'org.xmind.ui.org-chart.down': StructureClass.OrgChartDown,
    'org.xmind.ui.fishbone.normal': StructureClass.FishboneNormal,
    'org.xmind.ui.fishbone.left': StructureClass.FishboneLeft,
    'org.xmind.ui.spreadsheet': StructureClass.Spreadsheet,
    'org.xmind.ui.clockwise': StructureClass.Clockwise,
    'org.xmind.ui.anti-clockwise': StructureClass.AntiClockwise,
    'org.xmind.ui.radial': StructureClass.Radial,
  };
  return knownClasses[cls] || StructureClass.MindMap;
}

function resolveImageSrc(src: string): string {
  // XMind 实际格式：xap:attachments/xxx.png 或 xap:resources/xxx.png
  // zip-reader 读取后存储为 attachments/xxx.png 或 resources/xxx.png
  // 需要去掉 xap: 前缀以匹配
  if (src.startsWith('xap:')) {
    return src.substring(4);
  }
  return src;
}
