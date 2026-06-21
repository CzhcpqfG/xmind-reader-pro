import type { ExportOptions } from '@xmind-reader/core';

export async function exportToPDF(
  svgElement: SVGSVGElement,
  options?: Partial<ExportOptions>
): Promise<Blob> {
  // Will use jsPDF + svg2pdf.js in full implementation
  throw new Error('PDF export not yet implemented');
}
