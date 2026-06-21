export async function exportToSVG(svgElement: SVGSVGElement): Promise<Blob> {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  return new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
}
