export async function exportToPNG(
  svgElement: SVGSVGElement,
  scale: number = 2
): Promise<Blob> {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svgElement.clientWidth * scale;
      canvas.height = svgElement.clientHeight * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create PNG blob'));
      }, 'image/png');
    };
    img.onerror = reject;
    img.src = url;
  });
}
