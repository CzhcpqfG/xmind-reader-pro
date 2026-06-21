import type { LayoutNode, Relationship } from '@xmind-reader/core';
import type { ThemeConfig } from './types';

export function renderRelationships(
  parent: SVGGElement,
  layoutRoot: LayoutNode,
  relationships: Relationship[],
  theme: ThemeConfig
): void {
  if (!relationships || relationships.length === 0) return;

  // 创建箭头 marker 定义（添加到 parent 所属 svg 的 defs 中）
  const svg = parent.closest('svg');
  if (svg) {
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }

    if (!defs.querySelector('#relationship-arrowhead')) {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', 'relationship-arrowhead');
      marker.setAttribute('viewBox', '0 0 10 10');
      marker.setAttribute('refX', '9');
      marker.setAttribute('refY', '5');
      marker.setAttribute('markerWidth', '8');
      marker.setAttribute('markerHeight', '8');
      marker.setAttribute('orient', 'auto-start-reverse');

      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', '0 0, 10 5, 0 10');
      polygon.setAttribute('fill', theme.connectorColor);

      marker.appendChild(polygon);
      defs.appendChild(marker);
    }
  }

  // 创建关系线组
  const relGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  relGroup.classList.add('relationships');

  for (const rel of relationships) {
    const fromNode = findLayoutNodeById(layoutRoot, rel.fromId);
    const toNode = findLayoutNodeById(layoutRoot, rel.toId);
    if (!fromNode || !toNode) continue;

    renderSingleRelationship(relGroup, fromNode, toNode, rel, theme);
  }

  parent.appendChild(relGroup);
}

function renderSingleRelationship(
  parent: SVGGElement,
  fromNode: LayoutNode,
  toNode: LayoutNode,
  rel: Relationship,
  theme: ThemeConfig
): void {
  // 计算两个节点的中心点
  const fromCenterX = fromNode.x + fromNode.width / 2;
  const fromCenterY = fromNode.y + fromNode.height / 2;
  const toCenterX = toNode.x + toNode.width / 2;
  const toCenterY = toNode.y + toNode.height / 2;

  // 计算从源节点边缘到目标节点边缘的起止点
  const startPoint = getEdgePoint(fromNode, toCenterX, toCenterY);
  const endPoint = getEdgePoint(toNode, fromCenterX, fromCenterY);

  // 计算中点和偏移量，生成二次贝塞尔曲线控制点
  const midX = (startPoint.x + endPoint.x) / 2;
  const midY = (startPoint.y + endPoint.y) / 2;
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // 偏移量：垂直于连线方向，距离的 15%，使曲线有一定弧度
  const offset = dist * 0.15;
  const cpX = midX + (-dy / dist) * offset;
  const cpY = midY + (dx / dist) * offset;

  // 绘制曲线
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.classList.add('relationship');
  path.setAttribute('d', `M ${startPoint.x} ${startPoint.y} Q ${cpX} ${cpY} ${endPoint.x} ${endPoint.y}`);
  path.setAttribute('stroke', theme.connectorColor);
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-dasharray', '6 3');
  path.setAttribute('fill', 'none');
  path.setAttribute('marker-end', 'url(#relationship-arrowhead)');

  parent.appendChild(path);

  // 如果有关系标题，在中点渲染
  const title = rel.title;
  if (title) {
    const labelX = (startPoint.x + 2 * cpX + endPoint.x) / 4;
    const labelY = (startPoint.y + 2 * cpY + endPoint.y) / 4;

    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    fo.setAttribute('x', String(labelX - 40));
    fo.setAttribute('y', String(labelY - 10));
    fo.setAttribute('width', '80');
    fo.setAttribute('height', '20');
    fo.classList.add('relationship-label');

    const div = document.createElement('div');
    div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    div.style.cssText = `
      font-size: 11px;
      color: ${theme.connectorColor};
      text-align: center;
      line-height: 20px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    div.textContent = title;

    fo.appendChild(div);
    parent.appendChild(fo);
  }
}

/** 递归查找指定 ID 的 LayoutNode */
function findLayoutNodeById(root: LayoutNode, id: string): LayoutNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findLayoutNodeById(child, id);
    if (found) return found;
  }
  return null;
}

/** 计算节点矩形上离目标点最近的边缘点 */
function getEdgePoint(node: LayoutNode, targetX: number, targetY: number): { x: number; y: number } {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const dx = targetX - cx;
  const dy = targetY - cy;

  // 如果两点重合，返回节点中心
  if (dx === 0 && dy === 0) {
    return { x: cx, y: cy };
  }

  const halfW = node.width / 2;
  const halfH = node.height / 2;

  // 计算射线与矩形边的交点
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  let scaleX: number;
  let scaleY: number;

  if (absDx * halfH > absDy * halfW) {
    // 交于左/右边
    scaleX = halfW / absDx;
    scaleY = scaleX;
  } else {
    // 交于上/下边
    scaleY = halfH / absDy;
    scaleX = scaleY;
  }

  return {
    x: cx + dx * scaleX,
    y: cy + dy * scaleY,
  };
}
