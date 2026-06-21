import type { LayoutNode } from '@xmind-reader/core';
import type { ThemeConfig } from './types';
import { ConnectorType } from './types';

export function renderConnector(
  parent: SVGGElement,
  parentLayout: LayoutNode,
  childLayout: LayoutNode,
  theme: ThemeConfig
): void {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.classList.add('connector');

  const d = computePathData(parentLayout, childLayout, theme.connectorType);
  path.setAttribute('d', d);
  path.setAttribute('stroke', theme.connectorColor);
  path.setAttribute('stroke-width', String(theme.connectorWidth));

  parent.appendChild(path);
}

function computePathData(
  parent: LayoutNode,
  child: LayoutNode,
  connectorType: ConnectorType
): string {
  const direction = child.direction || 'right';

  let startX: number, startY: number, endX: number, endY: number;

  if (direction === 'right') {
    startX = parent.x + parent.width;
    startY = parent.y + parent.height / 2;
    endX = child.x;
    endY = child.y + child.height / 2;
  } else if (direction === 'left') {
    startX = parent.x;
    startY = parent.y + parent.height / 2;
    endX = child.x + child.width;
    endY = child.y + child.height / 2;
  } else {
    // down
    startX = parent.x + parent.width / 2;
    startY = parent.y + parent.height;
    endX = child.x + child.width / 2;
    endY = child.y;
  }

  switch (connectorType) {
    case ConnectorType.Curve: {
      if (direction === 'down') {
        const midY = (startY + endY) / 2;
        return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
      }
      const midX = (startX + endX) / 2;
      return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
    }
    case ConnectorType.Polyline: {
      if (direction === 'down') {
        const midY = (startY + endY) / 2;
        return `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
      }
      const midX = (startX + endX) / 2;
      return `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
    }
    case ConnectorType.Straight:
    default:
      return `M ${startX} ${startY} L ${endX} ${endY}`;
  }
}
