import { XMLParser } from 'fast-xml-parser';
import type { NodeStyle } from './types/index';

interface StyleEntry {
  '@_id'?: string;
  '@_type'?: string;
  'topic-properties'?: Record<string, string>;
}

export function parseStylesXml(stylesXml: string): Map<string, NodeStyle> {
  const styleMap = new Map<string, NodeStyle>();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => name === 'style',
  });

  try {
    const parsed = parser.parse(stylesXml);
    const root = parsed['xmap-styles'] || parsed;
    const styles: StyleEntry[] = Array.isArray(root?.styles?.style)
      ? root.styles.style
      : root?.styles?.style
        ? [root.styles.style]
        : [];

    for (const style of styles) {
      if (style['@_id']) {
        const nodeStyle = resolveStyleProperties(style['topic-properties'] || {});
        styleMap.set(style['@_id'], nodeStyle);
      }
    }
  } catch {
    // Styles parsing is best-effort
  }

  return styleMap;
}

function resolveStyleProperties(props: Record<string, string>): NodeStyle {
  const style: NodeStyle = {};
  if (props['fill-color']) style.fillColor = props['fill-color'];
  if (props['text-color']) style.textColor = props['text-color'];
  if (props['border-color']) style.borderColor = props['border-color'];
  if (props['border-width']) style.borderWidth = parseFloat(props['border-width']);
  if (props['font-size']) style.fontSize = parseFloat(props['font-size']);
  if (props['font-weight']) style.fontWeight = props['font-weight'];
  if (props['shape-class']) {
    const shapeMap: Record<string, string> = {
      'org.xmind.ui.rounded-rect': 'rounded-rect',
      'org.xmind.ui.rectangle': 'rectangle',
      'org.xmind.ui.ellipse': 'ellipse',
      'org.xmind.ui.diamond': 'diamond',
      'org.xmind.ui.underline': 'underline',
    };
    style.shape = shapeMap[props['shape-class']] as any;
  }
  return style;
}
