import { computeLayout, StructureClass } from '@xmind-reader/core';
import type { LayoutResult, LayoutNode, MindMapNode, NodeSizeMap, Summary, Boundary, Relationship, ParsedTheme, ImageData } from '@xmind-reader/core';
import type { RendererOptions, RendererState, ThemeConfig } from './types';
import { DEFAULT_THEME } from './types';
import { renderNode } from './node-renderer';
import { renderConnector } from './connector-renderer';
import { renderBoundaries } from './boundary-renderer';
import { renderRelationships } from './relationship-renderer';
import { renderSummaries } from './summary-renderer';
import { measureAllNodeSizes } from './dom-measurer';
import { zoom as d3Zoom, zoomIdentity, D3ZoomEvent } from 'd3-zoom';
import { select } from 'd3-selection';

function parsedThemeToThemeConfig(parsed?: ParsedTheme): ThemeConfig | undefined {
  if (!parsed) return undefined;
  return {
    name: 'file',
    background: parsed.background,
    nodeDefaults: {
      fillColor: parsed.subTopicDefaults?.fillColor || '#f5f5f5',
      textColor: parsed.subTopicDefaults?.textColor || parsed.subTopicDefaults?.fillColor || '#333333',
      borderColor: parsed.subTopicDefaults?.borderColor || parsed.subTopicDefaults?.borderLineColor || '#dddddd',
      borderWidth: parsed.subTopicDefaults?.borderWidth ?? 1,
      borderRadius: parsed.subTopicDefaults?.borderRadius ?? 6,
      fontSize: parsed.subTopicDefaults?.fontSize ?? 14,
      fontFamily: parsed.subTopicDefaults?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    rootDefaults: {
      fillColor: parsed.rootDefaults?.fillColor || '#4285f4',
      textColor: parsed.rootDefaults?.textColor || '#ffffff',
      borderColor: parsed.rootDefaults?.borderColor || parsed.rootDefaults?.borderLineColor || '#3367d6',
      borderWidth: parsed.rootDefaults?.borderWidth ?? 2,
      borderRadius: parsed.rootDefaults?.borderRadius ?? 8,
      fontSize: parsed.rootDefaults?.fontSize ?? 20,
      fontFamily: parsed.rootDefaults?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    connectorColor: parsed.connectorColor || '#aaaaaa',
    connectorWidth: parsed.connectorWidth ?? 1.5,
    connectorType: DEFAULT_THEME.connectorType,
    summaryLineColor: parsed.summaryLineColor,
    summaryLineWidth: parsed.summaryLineWidth,
    boundaryFillColor: parsed.boundaryFillColor,
    boundaryLineColor: parsed.boundaryLineColor,
  } as ThemeConfig;
}

export class MindMapRenderer {
  private container: HTMLElement;
  private svg: SVGSVGElement | null = null;
  private mainGroup: SVGGElement | null = null;
  private contentGroup: SVGGElement | null = null; // 内部内容组，用于布局偏移
  private options: RendererOptions;
  private state: RendererState;
  private theme: ThemeConfig;
  private currentData: MindMapNode | null = null;
  private currentStructureClass: StructureClass = StructureClass.MindMap;
  private currentLayout: LayoutResult | null = null;
  private currentSummaries: Summary[] = [];
  private currentBoundaries: Boundary[] = [];
  private currentRelationships: Relationship[] = [];
  private isFirstRender = true;
  private zoomBehavior: any = null;
  private measuredSizeMap: NodeSizeMap | null = null;

  constructor(options: RendererOptions) {
    this.container = options.container;
    this.options = options;
    this.theme = options.theme || DEFAULT_THEME;
    this.state = {
      scale: options.initialScale || 1,
      translateX: 0,
      translateY: 0,
      hoveredNodeId: null,
      selectedNodeId: null,
      collapsedNodeIds: new Set(),
      searchHighlightIds: new Set(),
    };
  }

  setData(rootNode: MindMapNode, structureClass: StructureClass, sheetTheme?: ParsedTheme, summaries?: Summary[], boundaries?: Boundary[], relationships?: Relationship[]): void {
    this.currentData = rootNode;
    this.currentStructureClass = structureClass;
    this.measuredSizeMap = null; // 重置实测尺寸

    // 先设置当前 sheet 的附加数据，确保布局计算使用正确的数据
    this.currentSummaries = summaries || [];
    this.currentBoundaries = boundaries || [];
    this.currentRelationships = relationships || [];

    // 应用文件中的 theme
    const fileTheme = parsedThemeToThemeConfig(sheetTheme);
    if (fileTheme) {
      this.theme = fileTheme;
    }

    // Step 1: 用估算尺寸做初始布局（传入 summaries/boundaries/theme 预留空间）
    const layout = computeLayout(
      rootNode, structureClass, undefined, this.state.collapsedNodeIds,
      this.currentSummaries, this.currentBoundaries, sheetTheme
    );
    this.currentLayout = layout;

    if (this.isFirstRender || !this.svg) {
      this.clear();
      this.createSVG();
      if (!this.svg || !this.mainGroup) return;
      this.setupZoom();

      const fitScale = Math.min(
        this.container.clientWidth / layout.width,
        this.container.clientHeight / layout.height
      ) * 0.85;
      this.state.scale = fitScale;
      this.state.translateX = 0;
      this.state.translateY = 0;

      const initialTransform = zoomIdentity
        .translate(this.state.translateX, this.state.translateY)
        .scale(this.state.scale);
      select(this.svg).call(this.zoomBehavior.transform, initialTransform);
      this.isFirstRender = false;
    }

    // 渲染初始布局
    this.updateContent(layout);

    // Step 2: 用浏览器 DOM 实测尺寸，重新布局
    this.relayoutWithMeasuredSizes();
  }

  /** 用浏览器 DOM 实测所有节点尺寸，然后重新布局 */
  private relayoutWithMeasuredSizes(): void {
    if (!this.currentData || !this.svg) return;

    // 实测所有节点尺寸
    const sizeMap = measureAllNodeSizes(this.currentData, this.theme);
    this.measuredSizeMap = sizeMap;

    // 用实测尺寸重新计算布局（传入 summaries/boundaries/theme 预留空间）
    const newLayout = computeLayout(
      this.currentData, this.currentStructureClass, sizeMap, this.state.collapsedNodeIds,
      this.currentSummaries, this.currentBoundaries, undefined
    );
    this.currentLayout = newLayout;

    // 只更新内容，不重置缩放
    this.updateContent(newLayout);
  }

  /** 只更新 contentGroup 内容，保留 mainGroup 的缩放/平移状态 */
  private updateContent(layoutResult: LayoutResult): void {
    if (!this.svg || !this.contentGroup) return;

    // 清空 contentGroup（保留 mainGroup 的 d3-zoom transform）
    while (this.contentGroup.firstChild) {
      this.contentGroup.removeChild(this.contentGroup.firstChild);
    }

    // 应用布局偏移到 contentGroup
    this.contentGroup.setAttribute('transform', `translate(${layoutResult.offsetX}, ${layoutResult.offsetY})`);

    // 渲染连线（在节点下层）
    this.renderConnectors(layoutResult.root);
    // 渲染边界框（在节点下层）
    if (this.currentBoundaries.length > 0) {
      renderBoundaries(this.contentGroup, layoutResult.root, this.currentBoundaries, this.theme);
    }
    // 渲染节点
    this.renderNodes(layoutResult.root);
    // 渲染概要（大括号）
    if (this.currentSummaries.length > 0) {
      renderSummaries(this.contentGroup, layoutResult.root, this.currentSummaries, layoutResult.summaryLayouts, this.theme);
    }
    // 渲染关系线
    if (this.currentRelationships.length > 0) {
      renderRelationships(this.contentGroup, layoutResult.root, this.currentRelationships, this.theme);
    }

    // 恢复选中状态和搜索高亮（DOM 重建后丢失）
    this.updateSelection();
    this.applySearchHighlight();
  }

  /** 设置当前画布的附加数据（概要、边界框、关系线） */
  setSheetData(summaries: Summary[], boundaries: Boundary[], relationships: Relationship[]): void {
    this.currentSummaries = summaries || [];
    this.currentBoundaries = boundaries || [];
    this.currentRelationships = relationships || [];
    if (this.currentLayout) {
      this.updateContent(this.currentLayout);
    }
  }

  updateTheme(theme: ThemeConfig): void {
    this.theme = theme;
    if (this.svg) {
      this.svg.style.background = theme.background;
    }
    if (this.currentData) {
      this.measuredSizeMap = null;
      this.relayoutWithMeasuredSizes();
    }
  }

  getState(): RendererState {
    return { ...this.state, collapsedNodeIds: new Set(this.state.collapsedNodeIds), searchHighlightIds: new Set(this.state.searchHighlightIds) };
  }

  /** 设置缩放比例（由工具栏/键盘快捷键调用） */
  setZoom(scale: number): void {
    if (!this.svg || !this.zoomBehavior) return;
    const clamped = Math.max(0.05, Math.min(4, scale));
    select(this.svg).call(this.zoomBehavior.scaleTo, clamped);
  }

  /** 放大 */
  zoomIn(): void {
    this.setZoom(this.state.scale * 1.2);
  }

  /** 缩小 */
  zoomOut(): void {
    this.setZoom(this.state.scale / 1.2);
  }

  /** 适应窗口 */
  fitToView(): void {
    if (!this.svg || !this.zoomBehavior || !this.currentLayout) return;
    const layout = this.currentLayout;
    const fitScale = Math.min(
      this.container.clientWidth / layout.width,
      this.container.clientHeight / layout.height
    ) * 0.85;
    const clamped = Math.max(0.05, Math.min(4, fitScale));
    const transform = zoomIdentity.scale(clamped);
    select(this.svg).call(this.zoomBehavior.transform, transform);
  }

  highlightNodes(nodeIds: string[]): void {
    this.state.searchHighlightIds = new Set(nodeIds);
    if (!this.svg) return;
    this.svg.querySelectorAll('.mindmap-node').forEach(el => {
      const id = el.getAttribute('data-node-id');
      if (id && this.state.searchHighlightIds.has(id)) {
        el.classList.add('highlighted');
      } else {
        el.classList.remove('highlighted');
      }
    });
  }

  clearHighlight(): void {
    this.state.searchHighlightIds.clear();
    if (!this.svg) return;
    this.svg.querySelectorAll('.highlighted').forEach(el => el.classList.remove('highlighted'));
  }

  toggleCollapse(nodeId: string): void {
    if (this.state.collapsedNodeIds.has(nodeId)) {
      this.state.collapsedNodeIds.delete(nodeId);
    } else {
      this.state.collapsedNodeIds.add(nodeId);
    }
    // 重新计算布局（折叠的节点不参与子树布局，传入 summaries/boundaries/theme 预留空间）
    if (this.currentData && this.measuredSizeMap) {
      // 记录折叠前的布局偏移
      const oldOffsetX = this.currentLayout?.offsetX ?? 0;
      const oldOffsetY = this.currentLayout?.offsetY ?? 0;

      const newLayout = computeLayout(
        this.currentData, this.currentStructureClass, this.measuredSizeMap, this.state.collapsedNodeIds,
        this.currentSummaries, this.currentBoundaries, undefined
      );
      this.currentLayout = newLayout;

      // 补偿布局偏移变化，保持视口位置不变
      const dx = newLayout.offsetX - oldOffsetX;
      const dy = newLayout.offsetY - oldOffsetY;
      if ((dx !== 0 || dy !== 0) && this.mainGroup && this.zoomBehavior) {
        // 调整 mainGroup 的 transform 来抵消 contentGroup 偏移变化
        const t = this.state;
        const newTransform = zoomIdentity.translate(t.translateX - dx * t.scale, t.translateY - dy * t.scale).scale(t.scale);
        select(this.svg!).call(this.zoomBehavior.transform, newTransform);
      }

      this.updateContent(newLayout);
    }
  }

  destroy(): void {
    this.clear();
  }

  private clear(): void {
    if (this.svg && this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
    this.svg = null;
    this.mainGroup = null;
    this.zoomBehavior = null;
  }

  private createSVG(): void {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.background = this.theme.background;
    svg.style.cursor = 'grab';

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      .mindmap-node { cursor: pointer; transition: filter 0.15s ease; }
      .mindmap-node:hover { filter: brightness(1.02); }
      .mindmap-node:hover rect {
        stroke: #0A84FF;
        stroke-width: 1.5;
        stroke-opacity: 0.4;
      }
      .mindmap-node.highlighted rect {
        stroke: #FF9F0A;
        stroke-width: 2;
        stroke-opacity: 0.8;
      }
      .mindmap-node.selected rect {
        stroke: #0A84FF;
        stroke-width: 2;
        stroke-opacity: 0.9;
      }
      .collapse-toggle { cursor: pointer; }
      .collapse-toggle:hover circle { fill: #E5E5EA; }
      .connector { fill: none; }
      .minimap-viewport { fill: rgba(10,132,255,0.1); stroke: #0A84FF; stroke-width: 1; }
    `;
    defs.appendChild(style);
    svg.appendChild(defs);

    const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    mainGroup.classList.add('main-group');
    svg.appendChild(mainGroup);

    const contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    contentGroup.classList.add('content-group');
    mainGroup.appendChild(contentGroup);

    this.container.appendChild(svg);
    this.svg = svg;
    this.mainGroup = mainGroup;
    this.contentGroup = contentGroup;
  }

  private setupZoom(): void {
    if (!this.svg || !this.mainGroup) return;
    const selection = select(this.svg);
    this.zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 4])
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        this.mainGroup!.setAttribute('transform', event.transform.toString());
        this.state.scale = event.transform.k;
        this.state.translateX = event.transform.x;
        this.state.translateY = event.transform.y;
        if (this.options.onZoomChange) {
          this.options.onZoomChange(event.transform.k);
        }
      });
    selection.call(this.zoomBehavior);
  }

  private renderNodes(node: LayoutNode): void {
    if (!this.contentGroup) return;
    renderNode(this.contentGroup, node, this.theme, this.state, {
      onClick: (n) => {
        this.state.selectedNodeId = n.id;
        this.options.onNodeClick?.(n.data);
        this.updateSelection();
      },
      onHover: (n) => {
        this.state.hoveredNodeId = n?.id ?? null;
        this.options.onNodeHover?.(n?.data ?? null);
      },
      onCollapseToggle: (nodeId) => {
        this.toggleCollapse(nodeId);
        this.options.onCollapseToggle?.(nodeId);
      },
      onImageClick: (image: ImageData) => {
        this.options.onImageClick?.(image);
      },
    });
    // LayoutNode.children is already filtered by collapsedNodeIds in computeLayout
    for (const child of node.children) {
      this.renderNodes(child);
    }
  }

  private renderConnectors(node: LayoutNode): void {
    if (!this.contentGroup) return;
    for (const child of node.children) {
      renderConnector(this.contentGroup, node, child, this.theme);
      this.renderConnectors(child);
    }
  }

  private updateSelection(): void {
    if (!this.svg) return;
    this.svg.querySelectorAll('.mindmap-node').forEach(el => {
      const id = el.getAttribute('data-node-id');
      if (id === this.state.selectedNodeId) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  }

  private applySearchHighlight(): void {
    if (!this.svg) return;
    this.svg.querySelectorAll('.mindmap-node').forEach(el => {
      const id = el.getAttribute('data-node-id');
      if (id && this.state.searchHighlightIds.has(id)) {
        el.classList.add('highlighted');
      } else {
        el.classList.remove('highlighted');
      }
    });
  }

}
