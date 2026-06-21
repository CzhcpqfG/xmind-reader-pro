import { XMLParser } from 'fast-xml-parser';
import type {
  MindMapData,
  MindMapNode,
  Sheet,
  Relationship,
  MarkerInfo,
  NodeStyle,
  Summary,
  Boundary,
  Comment,
} from './types/index';
import { StructureClass } from './types/index';

interface XMLSheet {
  '@_id': string;
  '@_timestamp'?: string;
  topic?: XMLTopic;
  title?: string;
  relationship?: XMLRelationship[];
  summary?: XMLSummary | XMLSummary[];
  boundary?: XMLBoundary | XMLBoundary[];
}

interface XMLTopic {
  '@_id': string;
  '@_structure-class'?: string;
  '@_timestamp'?: string;
  '@_custom-width'?: string;
  title?: string;
  'plain-notes'?: string;
  'html-notes'?: { '__cdata'?: string; '#text'?: string } | string;
  labels?: { label?: string[] };
  markerRefs?: { markerRef?: { '@_marker-id': string }[] };
  children?: { topics?: { topic?: XMLTopic | XMLTopic[]; '@_type'?: string }[] };
  extensions?: any;
  position?: { '@_svg-x'?: string; '@_svg-y'?: string };
  image?: { '@_xhtml:src'?: string; '@_width'?: string; '@_height'?: string };
  href?: string;
  comments?: { comment?: XMLComment | XMLComment[] };
}

interface XMLRelationship {
  '@_id': string;
  '@_end1'?: string;
  '@_end2'?: string;
  title?: string;
}

interface XMLSummary {
  '@_id': string;
  '@_range'?: string;
  title?: string;
}

interface XMLBoundary {
  '@_id': string;
  '@_range'?: string;
  title?: string;
}

interface XMLComment {
  '@_author'?: string;
  '@_time'?: string;
  '#text'?: string;
}

export function parseXMLFormat(contentXml: string, stylesXml?: string): MindMapData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['topic', 'markerRef', 'relationship', 'label', 'comment'].includes(name),
    processEntities: true,
    htmlEntities: true,
  });

  const parsed = parser.parse(contentXml);

  // Navigate to sheets - handle both xmap-content and sheet structures
  const root = parsed['xmap-content'] || parsed;
  const xmlSheets: XMLSheet[] = ensureArray(root?.sheet);

  const sheets: Sheet[] = xmlSheets.map((sheet, index) => {
    // topic 可能被 isArray 规则解析为数组，取第一个
    const rawTopic = sheet.topic;
    const topic = Array.isArray(rawTopic) ? rawTopic[0] : rawTopic;
    return {
      id: sheet['@_id'] || `sheet-${index}`,
      title: typeof sheet.title === 'string' ? sheet.title : (sheet.title as any)?.['#text'] || `画布 ${index + 1}`,
      rootTopic: topic ? parseXMLTopic(topic, 0) : createEmptyNode(`root-${index}`, 0),
      structureClass: normalizeStructureClass(topic?.['@_structure-class'] || ''),
      relationships: parseXMLRelationships(sheet.relationship),
      summaries: parseXMLSummaries(sheet.summary),
      boundaries: parseXMLBoundaries(sheet.boundary),
    };
  });

  return { sheets };
}

function parseXMLTopic(topic: XMLTopic, level: number): MindMapNode {
  const rawTitle = topic.title;
  const title = typeof rawTitle === 'string' ? rawTitle : (rawTitle as any)?.['#text'] || (rawTitle as any)?.['__cdata'] || '';
  const children: MindMapNode[] = [];
  const detachedChildren: MindMapNode[] = [];

  // Parse children topics
  if (topic.children?.topics) {
    const topicsArray = ensureArray(topic.children.topics);
    for (const topicsGroup of topicsArray) {
      if (topicsGroup.topic) {
        const topicList = ensureArray(topicsGroup.topic);
        const isDetached = topicsGroup['@_type'] === 'detached';
        for (const child of topicList) {
          const parsed = parseXMLTopic(child, level + 1);
          if (isDetached) {
            detachedChildren.push(parsed);
          } else {
            children.push(parsed);
          }
        }
      }
    }
  }

  // Parse markers
  const markers: MarkerInfo[] = [];
  if (topic.markerRefs?.markerRef) {
    const refs = ensureArray(topic.markerRefs.markerRef);
    for (const ref of refs) {
      markers.push(parseMarkerId(ref['@_marker-id']));
    }
  }

  // Parse labels
  let labels: string[] | undefined;
  if (topic.labels?.label) {
    labels = ensureArray(topic.labels.label);
  }

  // Parse notes
  let plainNotes: string | undefined;
  if (topic['plain-notes']) {
    plainNotes = typeof topic['plain-notes'] === 'string'
      ? topic['plain-notes']
      : String(topic['plain-notes']);
  }

  let htmlNotes: string | undefined;
  if (topic['html-notes']) {
    const htmlContent = topic['html-notes'];
    htmlNotes = typeof htmlContent === 'string'
      ? htmlContent
      : htmlContent?.['__cdata'] || htmlContent?.['#text'] || '';
  }

  // Parse comments
  let comments: Comment[] | undefined;
  if (topic.comments?.comment) {
    const rawComments = ensureArray(topic.comments.comment);
    comments = rawComments.map(c => ({
      author: c['@_author'] || '',
      content: c['#text'] || '',
      time: c['@_time'] || '',
    }));
  }

  // Parse position
  let position: { x: number; y: number } | undefined;
  if (topic.position) {
    const px = parseFloat(topic.position['@_svg-x'] || '0');
    const py = parseFloat(topic.position['@_svg-y'] || '0');
    if (!isNaN(px) || !isNaN(py)) {
      position = { x: px, y: py };
    }
  }

  // Parse customWidth
  let customWidth: number | undefined;
  if (topic['@_custom-width']) {
    const w = parseFloat(topic['@_custom-width']);
    if (!isNaN(w)) customWidth = w;
  }

  return {
    id: topic['@_id'],
    title,
    labels,
    notes: (plainNotes || htmlNotes) ? { plain: plainNotes, html: htmlNotes } : undefined,
    href: topic.href,
    image: topic.image ? {
      src: resolveImageSrc(topic.image['@_xhtml:src'] || ''),
      width: topic.image['@_width'] ? parseFloat(topic.image['@_width']) : undefined,
      height: topic.image['@_height'] ? parseFloat(topic.image['@_height']) : undefined,
    } : undefined,
    markers,
    children,
    detachedChildren: detachedChildren.length > 0 ? detachedChildren : undefined,
    structureClass: normalizeStructureClass(topic['@_structure-class'] || '') as StructureClass | undefined,
    level,
    customWidth,
    comments,
    position,
  };
}

function parseXMLSummaries(summaries?: XMLSummary | XMLSummary[]): Summary[] | undefined {
  if (!summaries) return undefined;
  const arr = ensureArray(summaries);
  if (arr.length === 0) return undefined;
  return arr.map(s => ({
    id: s['@_id'],
    title: typeof s.title === 'string' ? s.title : '',
    range: s['@_range'] ? s['@_range'].split(',').map((id: string) => id.trim()) : [],
  }));
}

function parseXMLBoundaries(boundaries?: XMLBoundary | XMLBoundary[]): Boundary[] | undefined {
  if (!boundaries) return undefined;
  const arr = ensureArray(boundaries);
  if (arr.length === 0) return undefined;
  return arr.map(b => ({
    id: b['@_id'],
    title: typeof b.title === 'string' ? b.title : '',
    range: b['@_range'] ? b['@_range'].split(',').map((id: string) => id.trim()) : [],
  }));
}

function parseXMLRelationships(rels?: XMLRelationship[]): Relationship[] {
  if (!rels) return [];
  return ensureArray(rels).map(r => ({
    id: r['@_id'],
    fromId: r['@_end1'] || '',
    toId: r['@_end2'] || '',
    title: r.title,
  }));
}

function parseMarkerId(markerId: string): MarkerInfo {
  const parts = markerId.split('-');
  return {
    markerId,
    family: parts[0] || 'unknown',
    index: parseInt(parts[parts.length - 1]) || 0,
  };
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
  if (src.startsWith('xap:')) {
    return src.substring(4);
  }
  return src;
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function createEmptyNode(id: string, level: number): MindMapNode {
  return {
    id,
    title: '(空)',
    markers: [],
    children: [],
    level,
  };
}
