import JSZip from 'jszip';
import type { XMindFile } from './types/index';

export type XMindFormat = 'json' | 'xml';

export interface ZipContent {
  format: XMindFormat;
  contentJson?: string;
  contentXml?: string;
  stylesXml?: string;
  metadataJson?: string;
  manifestJson?: string;
  attachments: Map<string, ArrayBuffer>;
}

export async function readZipFile(buffer: ArrayBuffer): Promise<ZipContent> {
  const zip = await JSZip.loadAsync(buffer);
  const attachments = new Map<string, ArrayBuffer>();

  // Read all entries
  const contentJsonFile = zip.file('content.json');
  const contentXmlFile = zip.file('content.xml');
  const stylesXmlFile = zip.file('styles.xml');
  const metadataJsonFile = zip.file('metadata.json');
  const manifestJsonFile = zip.file('manifest.json');

  const contentJson = contentJsonFile ? await contentJsonFile.async('string') : undefined;
  const contentXml = contentXmlFile ? await contentXmlFile.async('string') : undefined;
  const stylesXml = stylesXmlFile ? await stylesXmlFile.async('string') : undefined;
  const metadataJson = metadataJsonFile ? await metadataJsonFile.async('string') : undefined;
  const manifestJson = manifestJsonFile ? await manifestJsonFile.async('string') : undefined;

  // Read attachments (images etc.)
  const attachmentPrefixes = ['attachments/', 'resources/'];
  for (const [path, file] of Object.entries(zip.files)) {
    if (!file.dir && attachmentPrefixes.some(p => path.startsWith(p))) {
      const data = await file.async('arraybuffer');
      attachments.set(path, data);
    }
  }

  const format: XMindFormat = contentJson ? 'json' : 'xml';

  return {
    format,
    contentJson,
    contentXml,
    stylesXml,
    metadataJson,
    manifestJson,
    attachments,
  };
}

export async function detectFormat(buffer: ArrayBuffer): Promise<XMindFormat> {
  const content = await readZipFile(buffer);
  return content.format;
}
