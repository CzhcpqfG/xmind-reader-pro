// ===== XMind Raw Types (from file) =====

/** New format (XMind 2020+) root */
export interface XMindFile {
  id: string;
  class: string;
  title: string;
  rootTopic: XMindTopic;
  structureClass?: string;
  style?: XMindSheetStyle;
  relationships?: XMindRelationship[];
  summaries?: XMindSummary[];
  boundaries?: XMindBoundary[];
}

export interface XMindSummary {
  id: string;
  title?: string;
  range: string[];
  style?: XMindTopicStyle;
}

export interface XMindBoundary {
  id: string;
  title?: string;
  range: string[];
  style?: XMindTopicStyle;
}

/** Topic node in new format */
export interface XMindTopic {
  id: string;
  class?: string;
  title?: string;
  text?: XMindRichText;
  labels?: string[];
  notes?: XMindNotes;
  href?: string;
  image?: XMindImage;
  markers?: XMindMarker[];
  children?: XMindChildren;
  style?: XMindTopicStyle;
  structureClass?: string;
  extensions?: Record<string, unknown>;
  comments?: XMindComment[];
  ref?: string;
  attributedTitle?: XMindAttributedTitleSegment[];
  customWidth?: number;
  position?: { x: number; y: number };
  /** 概要内容节点数组（含 title/image/children），单数 - 内容 */
  summary?: XMindTopic[];
  /** 概要括号定义数组（range 引用兄弟索引），复数 - 括号 */
  summaries?: XMindSummary[];
  /** 边界框定义数组 */
  boundaries?: XMindBoundary[];
}

export interface XMindAttributedTitleSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikeThrough?: boolean;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  href?: string;
}

export interface XMindRichText {
  text: string;
}

export interface XMindNotes {
  plain?: { content: string };
  html?: { content: string };
}

export interface XMindImage {
  src: string;
  width?: number;
  height?: number;
}

export interface XMindMarker {
  markerId: string;
}

export interface XMindChildren {
  attached?: XMindTopic[];
  detached?: XMindTopic[];
  /** 概要内容节点数组（与 attached 同级，是 XMind 真实存放位置） */
  summary?: XMindTopic[];
}

export interface XMindSheetStyle {
  rootTopic?: XMindTopicStyle;
}

export interface XMindTopicStyle {
  id?: string;
  properties?: Record<string, unknown>;
}

export interface XMindRelationship {
  id: string;
  end1Id: string;
  end2Id: string;
  title?: string;
  label?: string;
  lineType?: string;
}

export interface XMindComment {
  id?: string;
  author: string;
  content: string;
  time?: string;
  creationTime?: number | string;
}

// ===== Parsed Data Model =====

export interface MindMapData {
  sheets: Sheet[];
  metadata?: Metadata;
}

export interface ParsedTheme {
  background: string;
  rootDefaults: NodeStyle & { fontFamily?: string; fontSize?: number };
  mainTopicDefaults: NodeStyle & { fontFamily?: string; fontSize?: number };
  subTopicDefaults: NodeStyle & { fontFamily?: string; fontSize?: number };
  summaryLineColor?: string;
  summaryLineWidth?: number;
  boundaryFillColor?: string;
  boundaryLineColor?: string;
  connectorColor?: string;
  connectorWidth?: number;
}

export interface Sheet {
  id: string;
  title: string;
  rootTopic: MindMapNode;
  structureClass: StructureClass;
  relationships: Relationship[];
  summaries?: Summary[];
  boundaries?: Boundary[];
  theme?: ParsedTheme;
}

export interface MindMapNode {
  id: string;
  title: string;
  richText?: string;
  richTextSegments?: RichTextSegment[];
  labels?: string[];
  notes?: NoteContent;
  href?: string;
  image?: ImageData;
  markers: MarkerInfo[];
  children: MindMapNode[];
  detachedChildren?: MindMapNode[];
  style?: NodeStyle;
  structureClass?: StructureClass;
  level: number;
  customWidth?: number;
  collapsed?: boolean;
  comments?: Comment[];
  position?: { x: number; y: number };
  /** notes HTML 中嵌入的图片引用（解析后的形式） */
  noteImageRefs?: string[];
  /** notes 中嵌入的图片，已绑定 buffer */
  notesImages?: ImageData[];
}

export interface NoteContent {
  plain?: string;
  html?: string;
}

export interface ImageData {
  src: string;
  width?: number;
  height?: number;
  mediaType?: string;
  buffer?: ArrayBuffer;
}

export interface MarkerInfo {
  markerId: string;
  family: string;
  index: number;
}

export interface NodeStyle {
  fillColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  fillPattern?: string;
  borderLineColor?: string;
  shape?: NodeShape;
  width?: number;
  height?: number;
  borderRadius?: number;
  lineHeight?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineWidth?: number;
  lineColor?: string;
  linePattern?: string;
}

export interface Summary {
  id: string;
  title?: string;
  /** 范围：被此大括号覆盖的兄弟节点 ID 列表（由 range 索引解析而来） */
  range: string[];
  style?: NodeStyle;
  /** 大括号内容节点的图片（来自 topic.summary[i].image） */
  image?: ImageData;
  /** 大括号内容节点下的子节点（来自 topic.summary[i].children） */
  children?: MindMapNode[];
  /** 内部内容节点的子节点（用于渲染时遍历图片） */
  innerNotesImages?: ImageData[];
}

export interface Boundary {
  id: string;
  title?: string;
  range: string[];
  style?: NodeStyle;
}

export interface Comment {
  author: string;
  content: string;
  time: string;
}

export interface RichTextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikeThrough?: boolean;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  href?: string;
}

export enum NodeShape {
  Rectangle = 'rectangle',
  RoundedRect = 'rounded-rect',
  Ellipse = 'ellipse',
  Diamond = 'diamond',
  Underline = 'underline',
  None = 'none',
}

export enum StructureClass {
  MindMap = 'org.xmind.ui.mindmap',
  LogicRight = 'org.xmind.ui.logic.right',
  LogicLeft = 'org.xmind.ui.logic.left',
  TreeRight = 'org.xmind.ui.tree.right',
  TreeLeft = 'org.xmind.ui.tree.left',
  OrgChartNormal = 'org.xmind.ui.org-chart.normal',
  OrgChartDown = 'org.xmind.ui.org-chart.down',
  FishboneNormal = 'org.xmind.ui.fishbone.normal',
  FishboneLeft = 'org.xmind.ui.fishbone.left',
  Spreadsheet = 'org.xmind.ui.spreadsheet',
  Clockwise = 'org.xmind.ui.clockwise',
  AntiClockwise = 'org.xmind.ui.anti-clockwise',
  Radial = 'org.xmind.ui.radial',
}

export interface Relationship {
  id: string;
  fromId: string;
  toId: string;
  title?: string;
  lineType?: string;
}

export interface Metadata {
  creator?: string;
  create_time?: string;
  last_modifier?: string;
  last_modified_time?: string;
}

// ===== Layout Types =====

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: MindMapNode;
  children: LayoutNode[];
  direction?: 'left' | 'right' | 'down';
  depth: number;
}

export interface SummaryLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bracketPath: string;
  direction: 'left' | 'right';
  contentX: number;
  contentY: number;
}

export interface LayoutResult {
  root: LayoutNode;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  detachedNodes?: LayoutNode[];
  summaryLayouts?: SummaryLayout[];
}

// ===== Search Types =====

export interface SearchResult {
  nodeId: string;
  title: string;
  matches: SearchMatch[];
}

export interface SearchMatch {
  start: number;
  end: number;
  text: string;
}

// ===== Export Types =====

export enum ExportFormat {
  SVG = 'svg',
  PNG = 'png',
  PDF = 'pdf',
  Markdown = 'markdown',
}

export interface ExportOptions {
  format: ExportFormat;
  scale?: number;
  quality?: number;
  background?: string;
  margin?: number;
  pageSize?: { width: number; height: number };
}
