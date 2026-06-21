import type { LayoutResult, LayoutNode } from '@xmind-reader/core';
import type { RendererState, ThemeConfig } from './types';

export function renderMinimap(
  svg: SVGSVGElement,
  layoutResult: LayoutResult,
  state: RendererState,
  theme: ThemeConfig
): void {
  // Remove existing minimap
  svg.querySelectorAll('.minimap-container').forEach(el => el.remove());

  const svgRect = svg.getBoundingClientRect();
  const minimapWidth = 160;
  const minimapHeight = 120;
  const padding = 8;

  const minimapX = svgRect.width - minimapWidth - padding;
  const minimapY = svgRect.height - minimapHeight - padding;

  const scale = Math.min(
    minimapWidth / layoutResult.width,
    minimapHeight / layoutResult.height
  ) * 0.85;

  const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  container.classList.add('minimap-container');
  container.setAttribute('transform', `translate(${minimapX}, ${minimapY})`);

  // Background
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', String(minimapWidth));
  bg.setAttribute('height', String(minimapHeight));
  bg.setAttribute('fill', theme.background);
  bg.setAttribute('stroke', '#ddd');
  bg.setAttribute('stroke-width', '1');
  bg.setAttribute('rx', '4');
  bg.setAttribute('opacity', '0.9');
  container.appendChild(bg);

  // Content group
  const contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const offsetX = (minimapWidth - layoutResult.width * scale) / 2;
  const offsetY = (minimapHeight - layoutResult.height * scale) / 2;
  contentGroup.setAttribute('transform', `translate(${offsetX}, ${offsetY}) scale(${scale})`);

  // Render simplified nodes
  renderMinimapNodes(contentGroup, layoutResult.root, theme);

  container.appendChild(contentGroup);

  // Viewport indicator
  const vp = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  vp.classList.add('minimap-viewport');
  const vpWidth = (svgRect.width / state.scale) * scale;
  const vpHeight = (svgRect.height / state.scale) * scale;
  vp.setAttribute('width', String(Math.min(vpWidth, minimapWidth)));
  vp.setAttribute('height', String(Math.min(vpHeight, minimapHeight)));
  vp.setAttribute('x', String(offsetX + layoutResult.offsetX * scale));
  vp.setAttribute('y', String(offsetY + layoutResult.offsetY * scale));
  container.appendChild(vp);

  svg.appendChild(container);
}

function renderMinimapNodes(parent: SVGGElement, node: LayoutNode, theme: ThemeConfig): void {
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', String(node.x));
  rect.setAttribute('y', String(node.y));
  rect.setAttribute('width', String(node.width));
  rect.setAttribute('height', String(node.height));
  rect.setAttribute('fill', node.depth === 0 ? theme.rootDefaults.fillColor : theme.nodeDefaults.fillColor);
  rect.setAttribute('rx', '2');
  parent.appendChild(rect);

  for (const child of node.children) {
    renderMinimapNodes(parent, child, theme);
  }
}
