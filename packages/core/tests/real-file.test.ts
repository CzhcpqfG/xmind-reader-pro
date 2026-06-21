/**
 * 集成测试：在内存中生成一个含 summary / 图片 / boundary 的 XMind 文件
 * 验证解析器对真实结构的处理，不依赖外部 .xmind fixture
 */
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseXMind } from '../src/parser/index.js';

// 构造一个合法的最小 PNG 数据（IHDR 后紧跟 IDAT，PNG 签名开头）
function createTinyPng(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, // IHDR length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00,
    0x90, 0x77, 0x53, 0xde, // IHDR CRC
    0x00, 0x00, 0x00, 0x0c, // IDAT length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00,
    0x05, 0xfe, 0x02, 0xfe, // IDAT data + CRC
    0x00, 0x00, 0x00, 0x00, // IEND length
    0x49, 0x45, 0x4e, 0x44, // IEND
    0xae, 0x42, 0x60, 0x82, // IEND CRC
  ]);
}

function createIntegrationContentJson(): string {
  return JSON.stringify([
    {
      id: 'sheet-1',
      class: 'sheet',
      title: '集成测试',
      rootTopic: {
        id: 'root',
        title: '测试中心',
        structureClass: 'org.xmind.ui.mindmap',
        children: {
          attached: [
            { id: 'c1', title: '子项1', children: { attached: [] } },
            { id: 'c2', title: '子项2', image: { src: 'xap:resources/topic.png' }, children: { attached: [] } },
            { id: 'c3', title: '子项3', children: { attached: [] } },
            { id: 'c4', title: '子项4', children: { attached: [] } },
          ],
        },
        summary: [
          {
            id: 's-content-1',
            title: 'summary1',
            image: { src: 'xap:resources/summary1.png' },
          },
          {
            id: 's-content-2',
            title: 'summary2',
            image: { src: 'xap:resources/summary2.png' },
            children: {
              attached: [
                { id: 'sc-1', title: 'summary child', image: { src: 'xap:resources/summary-child.png' } },
              ],
            },
          },
        ],
        summaries: [
          { id: 's-bracket-1', range: '(1,2)', topicId: 's-content-1' },
          { id: 's-bracket-2', range: '(0,3)', topicId: 's-content-2' },
        ],
        boundaries: [
          { id: 'b-1', range: '(0,1)', style: { properties: { 'svg:fill': '#00FF00' } } },
        ],
      },
    },
  ]);
}

async function createIntegrationXMind(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const png = createTinyPng();

  zip.file('content.json', createIntegrationContentJson());
  zip.file('resources/topic.png', png);
  zip.file('resources/summary1.png', png);
  zip.file('resources/summary2.png', png);
  zip.file('resources/summary-child.png', png);

  return zip.generateAsync({ type: 'arraybuffer' });
}

describe('真实 XMind 结构集成测试（内存生成 fixture）', () => {
  it('应能成功解析文件', async () => {
    const buffer = await createIntegrationXMind();
    const data = await parseXMind(buffer);

    expect(data.sheets).toHaveLength(1);
    expect(data.sheets[0].rootTopic.title).toBe('测试中心');
  });

  it('应能提取 summary 括号与 range', async () => {
    const buffer = await createIntegrationXMind();
    const data = await parseXMind(buffer);

    const summaries = data.sheets[0].summaries;
    expect(summaries).toBeDefined();
    expect(summaries).toHaveLength(2);

    for (const s of summaries!) {
      expect(s.id).toBeTruthy();
      expect(s.range).toBeInstanceOf(Array);
      expect(s.range.length).toBeGreaterThan(0);
    }

    expect(summaries![0].range).toEqual(['c2', 'c3']);
    expect(summaries![1].range).toEqual(['c1', 'c2', 'c3', 'c4']);
  });

  it('应能提取 summary 中的内嵌图片', async () => {
    const buffer = await createIntegrationXMind();
    const data = await parseXMind(buffer);

    const summaries = data.sheets[0].summaries!;
    const withImages = summaries.filter(s => s.image?.buffer);
    expect(withImages.length).toBeGreaterThanOrEqual(2);

    for (const s of withImages) {
      expect(s.image!.buffer).toBeDefined();
      expect(s.image!.buffer!.byteLength).toBeGreaterThan(50);
      expect(s.image!.src).toMatch(/^resources\//);
    }
  });

  it('应能提取 summary 内 children 的图片', async () => {
    const buffer = await createIntegrationXMind();
    const data = await parseXMind(buffer);

    const summaries = data.sheets[0].summaries!;
    const withChildren = summaries.find(s => s.children && s.children.length > 0);
    expect(withChildren).toBeDefined();

    const childWithImage = withChildren!.children!.find(c => c.image?.buffer);
    expect(childWithImage).toBeDefined();
    expect(childWithImage!.image!.buffer!.byteLength).toBeGreaterThan(50);
  });

  it('应能提取所有图片（topic 直接图片 + summary 内嵌）', async () => {
    const buffer = await createIntegrationXMind();
    const data = await parseXMind(buffer);

    let totalImages = 0;
    let boundImages = 0;

    function walk(node: any) {
      if (node.image?.buffer) {
        totalImages++;
        boundImages++;
      }
      for (const c of node.children || []) walk(c);
      if (node.detachedChildren) for (const c of node.detachedChildren) walk(c);
    }

    function walkSummary(s: any) {
      if (s.image?.buffer) {
        totalImages++;
        boundImages++;
      }
      for (const c of s.children || []) walk(c);
    }

    walk(data.sheets[0].rootTopic);
    for (const s of data.sheets[0].summaries || []) walkSummary(s);

    expect(totalImages).toBeGreaterThanOrEqual(4);
    expect(boundImages).toBe(totalImages);
  });

  it('应能解析 boundary 边界框（range 同样为元组）', async () => {
    const buffer = await createIntegrationXMind();
    const data = await parseXMind(buffer);

    const boundaries = data.sheets[0].boundaries;
    expect(boundaries).toBeDefined();
    expect(boundaries).toHaveLength(1);

    const b = boundaries![0];
    expect(b.range).toHaveLength(2);
    expect(b.range).toEqual(['c1', 'c2']);
  });
});
