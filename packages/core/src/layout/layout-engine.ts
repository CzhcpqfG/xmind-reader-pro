import type { MindMapNode, LayoutResult, LayoutNode, Summary, Boundary, ParsedTheme } from '../types/index';
import { StructureClass } from '../types/index';
import { applyMindMapLayout } from './mindmap-layout';
import { applyLogicLayout } from './logic-layout';
import { applyTreeLayout } from './tree-layout';
import { applyOrgChartLayout } from './org-chart-layout';
import { applyFishboneLayout } from './fishbone-layout';

/** 预计算的节点尺寸 Map，nodeId → { width, height } */
export type NodeSizeMap = Map<string, { width: number; height: number }>;

export interface LayoutOptions {
  sizeMap?: NodeSizeMap;
  collapsedNodeIds?: Set<string>;
  summaries?: Summary[];
  boundaries?: Boundary[];
  theme?: ParsedTheme;
}

export function computeLayout(
  root: MindMapNode,
  structureClass: StructureClass,
  sizeMap?: NodeSizeMap,
  collapsedNodeIds?: Set<string>,
  summaries?: Summary[],
  boundaries?: Boundary[],
  theme?: ParsedTheme
): LayoutResult {
  const options: LayoutOptions = { sizeMap, collapsedNodeIds, summaries, boundaries, theme };
  switch (structureClass) {
    case StructureClass.LogicRight:
    case StructureClass.LogicLeft:
      return applyLogicLayout(root, structureClass, options);
    case StructureClass.TreeRight:
    case StructureClass.TreeLeft:
      return applyTreeLayout(root, structureClass, options);
    case StructureClass.OrgChartNormal:
    case StructureClass.OrgChartDown:
      return applyOrgChartLayout(root, structureClass, options);
    case StructureClass.FishboneNormal:
    case StructureClass.FishboneLeft:
      return applyFishboneLayout(root, structureClass, options);
    case StructureClass.MindMap:
    default:
      return applyMindMapLayout(root, structureClass, options);
  }
}
