/**
 * 核心解析功能测试
 * 构造模拟 .xmind 文件（ZIP 包含 content.json），验证解析流程
 */
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseXMind } from '../src/parser/index.js';
import { detectFormat } from '../src/zip-reader.js';
import { computeLayout } from '../src/layout/layout-engine.js';
import { StructureClass } from '../src/types/index.js';
import { flattenTree, findNodeById, countNodes } from '../src/utils/tree-utils.js';

// 构造新版 .xmind 文件的 content.json
function createTestContentJson() {
  return JSON.stringify([
    {
      id: 'sheet-1',
      class: 'sheet',
      title: '测试画布',
      rootTopic: {
        id: 'root-1',
        title: '中心主题',
        structureClass: 'org.xmind.ui.logic.right',
        children: {
          attached: [
            {
              id: 'child-1',
              title: '分支一',
              markers: [{ markerId: 'priority-1' }],
              notes: { plain: { content: '这是备注内容' } },
              children: {
                attached: [
                  { id: 'child-1-1', title: '子主题 1-1', children: { attached: [] } },
                  { id: 'child-1-2', title: '子主题 1-2', children: { attached: [] } },
                ],
              },
            },
            {
              id: 'child-2',
              title: '分支二',
              labels: ['标签A'],
              href: 'https://example.com',
              children: {
                attached: [
                  { id: 'child-2-1', title: '子主题 2-1', children: { attached: [] } },
                ],
              },
            },
            {
              id: 'child-3',
              title: '分支三',
              children: { attached: [] },
            },
          ],
        },
      },
      relationships: [
        { id: 'rel-1', end1Id: 'child-1', end2Id: 'child-2', title: '关联' },
      ],
    },
  ]);
}

// 构造旧版 .xmind 文件的 content.xml
function createTestContentXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0" version="2.0">
  <sheet id="sheet-old" timestamp="1000000">
    <topic id="root-old" structure-class="org.xmind.ui.logic.right" timestamp="1000000">
      <title>旧版中心主题</title>
      <children>
        <topics type="attached">
          <topic id="old-child-1" timestamp="1000001">
            <title>旧版分支一</title>
            <children>
              <topics type="attached">
                <topic id="old-child-1-1" timestamp="1000002">
                  <title>旧版子主题</title>
                </topic>
              </topics>
            </children>
          </topic>
          <topic id="old-child-2" timestamp="1000003">
            <title>旧版分支二</title>
          </topic>
        </topics>
      </children>
    </topic>
    <title>旧版画布</title>
  </sheet>
</xmap-content>`;
}

// 用 JSZip 构造新版 .xmind 文件 buffer
async function createNewFormatXMind(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('content.json', createTestContentJson());
  zip.file('metadata.json', JSON.stringify({ creator: 'test', createTime: '2024-01-01' }));
  return zip.generateAsync({ type: 'arraybuffer' });
}

// 用 JSZip 构造旧版 .xmind 文件 buffer
async function createOldFormatXMind(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('content.xml', createTestContentXml());
  return zip.generateAsync({ type: 'arraybuffer' });
}

describe('XMind 解析引擎', () => {
  it('应正确检测新版文件格式', async () => {
    const buffer = await createNewFormatXMind();
    const format = await detectFormat(buffer);
    expect(format).toBe('json');
  });

  it('应正确检测旧版文件格式', async () => {
    const buffer = await createOldFormatXMind();
    const format = await detectFormat(buffer);
    expect(format).toBe('xml');
  });

  it('应正确解析新版 content.json', async () => {
    const buffer = await createNewFormatXMind();
    const data = await parseXMind(buffer);

    expect(data.sheets).toHaveLength(1);
    expect(data.sheets[0].title).toBe('测试画布');
    expect(data.sheets[0].rootTopic.title).toBe('中心主题');
    expect(data.sheets[0].rootTopic.children).toHaveLength(3);
    expect(data.sheets[0].rootTopic.children[0].title).toBe('分支一');
    expect(data.sheets[0].rootTopic.children[0].markers).toHaveLength(1);
    expect(data.sheets[0].rootTopic.children[0].markers[0].family).toBe('priority');
    expect(data.sheets[0].rootTopic.children[0].notes?.plain).toBe('这是备注内容');
    expect(data.sheets[0].rootTopic.children[1].labels).toEqual(['标签A']);
    expect(data.sheets[0].rootTopic.children[1].href).toBe('https://example.com');
    expect(data.sheets[0].relationships).toHaveLength(1);
    expect(data.metadata?.creator).toBe('test');
  });

  it('应正确解析旧版 content.xml', async () => {
    const buffer = await createOldFormatXMind();
    const data = await parseXMind(buffer);

    expect(data.sheets).toHaveLength(1);
    expect(data.sheets[0].rootTopic.title).toBe('旧版中心主题');
    expect(data.sheets[0].rootTopic.children).toHaveLength(2);
    expect(data.sheets[0].rootTopic.children[0].title).toBe('旧版分支一');
    expect(data.sheets[0].rootTopic.children[0].children).toHaveLength(1);
    expect(data.sheets[0].rootTopic.children[0].children[0].title).toBe('旧版子主题');
  });
});

describe('布局引擎', () => {
  it('应正确计算思维导图布局', async () => {
    const buffer = await createNewFormatXMind();
    const data = await parseXMind(buffer);
    const layout = computeLayout(data.sheets[0].rootTopic, StructureClass.MindMap);

    expect(layout.root).toBeDefined();
    expect(layout.root.id).toBe('root-1');
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
    expect(layout.root.children.length).toBeGreaterThan(0);
  });

  it('应正确计算逻辑图布局', async () => {
    const buffer = await createNewFormatXMind();
    const data = await parseXMind(buffer);
    const layout = computeLayout(data.sheets[0].rootTopic, StructureClass.LogicRight);

    expect(layout.root).toBeDefined();
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
  });

  it('应正确计算树形布局', async () => {
    const buffer = await createNewFormatXMind();
    const data = await parseXMind(buffer);
    const layout = computeLayout(data.sheets[0].rootTopic, StructureClass.TreeRight);

    expect(layout.root).toBeDefined();
    expect(layout.root.direction).toBe('down');
  });

  it('应正确计算组织架构图布局', async () => {
    const buffer = await createNewFormatXMind();
    const data = await parseXMind(buffer);
    const layout = computeLayout(data.sheets[0].rootTopic, StructureClass.OrgChartNormal);

    expect(layout.root).toBeDefined();
    expect(layout.root.direction).toBe('down');
  });

  it('应正确计算鱼骨图布局', async () => {
    const buffer = await createNewFormatXMind();
    const data = await parseXMind(buffer);
    const layout = computeLayout(data.sheets[0].rootTopic, StructureClass.FishboneNormal);

    expect(layout.root).toBeDefined();
  });
});

describe('工具函数', () => {
  it('flattenTree 应返回所有节点', async () => {
    const buffer = await createNewFormatXMind();
    const data = await parseXMind(buffer);
    const allNodes = flattenTree(data.sheets[0].rootTopic);
    // root + 3 children + 2 sub-children + 1 sub-child = 7
    expect(allNodes).toHaveLength(7);
  });

  it('findNodeById 应找到指定节点', async () => {
    const buffer = await createNewFormatXMind();
    const data = await parseXMind(buffer);
    const node = findNodeById(data.sheets[0].rootTopic, 'child-1-1');
    expect(node).not.toBeNull();
    expect(node?.title).toBe('子主题 1-1');
  });

  it('countNodes 应正确计数', async () => {
    const buffer = await createNewFormatXMind();
    const data = await parseXMind(buffer);
    expect(countNodes(data.sheets[0].rootTopic)).toBe(7);
  });
});
