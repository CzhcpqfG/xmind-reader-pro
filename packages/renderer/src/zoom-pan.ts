import { zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
import { select } from 'd3-selection';
import type { RendererState } from './types';

export function applyZoomPan(
  svg: SVGSVGElement,
  state: RendererState,
  onTransformChange?: (state: RendererState) => void
): void {
  const selection = select(svg);
  const mainGroup = selection.select('.main-group');

  const zoomBehavior = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 3])
    .on('zoom', (event) => {
      mainGroup.attr('transform', event.transform.toString());
      if (onTransformChange) {
        onTransformChange({
          ...state,
          scale: event.transform.k,
          translateX: event.transform.x,
          translateY: event.transform.y,
        });
      }
    });

  selection.call(zoomBehavior);

  // Apply initial transform
  const initialTransform = zoomIdentity
    .translate(state.translateX, state.translateY)
    .scale(state.scale);
  selection.call(zoomBehavior.transform, initialTransform);
}

export function fitToView(
  svg: SVGSVGElement,
  contentWidth: number,
  contentHeight: number
): { scale: number; x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  const scaleX = rect.width / contentWidth;
  const scaleY = rect.height / contentHeight;
  const scale = Math.min(scaleX, scaleY) * 0.9;
  const x = (rect.width - contentWidth * scale) / 2;
  const y = (rect.height - contentHeight * scale) / 2;
  return { scale, x, y };
}

export function resetZoom(svg: SVGSVGElement): void {
  const selection = select(svg);
  const zoomBehavior = zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 3]);
  selection.call(zoomBehavior.transform, zoomIdentity);
}
