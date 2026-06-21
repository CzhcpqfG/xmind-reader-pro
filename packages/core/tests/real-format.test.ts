/**
 * 测试真实 XMind JSON 格式的 summary 解析
 * 模拟 XMind 实际输出：summary[] 数组（内容）+ summaries[] 数组（括号）
 * + range: "(startIdx,endIdx)" 元组字符串
 */
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseXMind } from '../src/parser/index.js';

// 模拟真实 XMind 内容：含 summary/summaries 元组 range
function createRealFormatContentJson(): string {
  return JSON.stringify([
    {
      id: 'sheet-1',
      class: 'sheet',
      title: '真实格式测试',
      rootTopic: {
        id: 'root',
        title: '中心',
        structureClass: 'org.xmind.ui.logic.right',
        children: {
          attached: [
            { id: 'c1', title: '子项1', children: { attached: [] } },
            { id: 'c2', title: '子项2', children: { attached: [] } },
            { id: 'c3', title: '子项3', children: { attached: [] } },
            { id: 'c4', title: '子项4', children: { attached: [] } },
          ],
        },
        // summary 内容节点
        summary: [
          {
            id: 's-content-1',
            title: '这三个名字调整了一下',
            image: { src: 'xap:resources/test1.png' },
            style: { id: 'style-1', properties: { 'svg:fill': '#FF0000' } },
          },
          {
            id: 's-content-2',
            title: '产品介绍图',
            image: { src: 'xap:resources/test2.png' },
            children: {
              attached: [
                { id: 'sc-2-1', title: '参考图', image: { src: 'xap:resources/test3.png' } },
              ],
            },
          },
        ],
        // summary 括号定义：range 是兄弟索引元组
        summaries: [
          { id: 's-bracket-1', range: '(1,2)', topicId: 's-content-1' },
          { id: 's-bracket-2', range: '(0,3)', topicId: 's-content-2' },
        ],
        // boundary 也是 range 元组
        boundaries: [
          { id: 'b-1', range: '(0,1)', style: { properties: { 'svg:fill': '#00FF00' } } },
        ],
      },
    },
  ]);
}

async function createTestXMind(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('content.json', createRealFormatContentJson());
  // 模拟图片附件
  zip.file('resources/test1.png', new Uint8Array([0x89, 0x50, 0x4E, 0x47]));
  zip.file('resources/test2.png', new Uint8Array([0x89, 0x50, 0x4E, 0x47]));
  zip.file('resources/test3.png', new Uint8Array([0x89, 0x50, 0x4E, 0x47]));
  return zip.generateAsync({ type: 'arraybuffer' });
}

describe('真实 XMind 格式：summary 解析', () => {
  it('应正确解析 summary 内容（含 title/image/style）', async () => {
    const buffer = await createTestXMind();
    const data = await parseXMind(buffer);

    const sheet = data.sheets[0];
    expect(sheet.summaries).toBeDefined();
    expect(sheet.summaries).toHaveLength(2);

    // 第一个 summary
    const s1 = sheet.summaries![0];
    expect(s1.id).toBe('s-bracket-1');
    expect(s1.title).toBe('这三个名字调整了一下');
    expect(s1.range).toEqual(['c2', 'c3']); // 索引 1-2
    expect(s1.image).toBeDefined();
    expect(s1.image?.src).toBe('resources/test1.png'); // xap: 前缀已去除
    expect(s1.image?.buffer).toBeDefined();
    expect(s1.image?.buffer?.byteLength).toBe(4);
  });

  it('应正确解析 summary 内的嵌套 children（含 image）', async () => {
    const buffer = await createTestXMind();
    const data = await parseXMind(buffer);

    const sheet = data.sheets[0];
    const s2 = sheet.summaries![1];
    expect(s2.title).toBe('产品介绍图');
    expect(s2.range).toEqual(['c1', 'c2', 'c3', 'c4']); // 索引 0-3
    expect(s2.image?.src).toBe('resources/test2.png');
    expect(s2.children).toBeDefined();
    expect(s2.children).toHaveLength(1);
    expect(s2.children![0].title).toBe('参考图');
    expect(s2.children![0].image?.src).toBe('resources/test3.png');
    expect(s2.children![0].image?.buffer?.byteLength).toBe(4);
  });

  it('应正确解析 range "(0,1)" 为闭合区间', async () => {
    const buffer = await createTestXMind();
    const data = await parseXMind(buffer);

    const sheet = data.sheets[0];
    expect(sheet.boundaries).toBeDefined();
    expect(sheet.boundaries).toHaveLength(1);
    expect(sheet.boundaries![0].range).toEqual(['c1', 'c2']); // 索引 0-1
  });

  it('应正确处理单个元素的 range "(n,n)"', async () => {
    const singleJson = JSON.stringify([{
      id: 'sheet-1',
      class: 'sheet',
      title: 'Test',
      rootTopic: {
        id: 'root',
        title: 'R',
        children: {
          attached: [
            { id: 'a', title: 'A', children: { attached: [] } },
            { id: 'b', title: 'B', children: { attached: [] } },
            { id: 'c', title: 'C', children: { attached: [] } },
          ],
        },
        summary: [{ id: 's1', title: '单点' }],
        summaries: [{ id: 'sb', range: '(1,1)', topicId: 's1' }],
      },
    }]);

    const zip = new JSZip();
    zip.file('content.json', singleJson);
    const buffer = await zip.generateAsync({ type: 'arraybuffer' });
    const data = await parseXMind(buffer);
    expect(data.sheets[0].summaries![0].range).toEqual(['b']); // 只索引 1
  });

  it('应处理没有 summary 内容但有 bracket 的情况（容错）', async () => {
    const orphanBracketJson = JSON.stringify([{
      id: 'sheet-1',
      class: 'sheet',
      title: 'Test',
      rootTopic: {
        id: 'root',
        title: 'R',
        children: {
          attached: [
            { id: 'a', title: 'A', children: { attached: [] } },
            { id: 'b', title: 'B', children: { attached: [] } },
          ],
        },
        summaries: [{ id: 'sb', range: '(0,1)', topicId: 'non-existent' }], // topicId 找不到
      },
    }]);

    const zip = new JSZip();
    zip.file('content.json', orphanBracketJson);
    const buffer = await zip.generateAsync({ type: 'arraybuffer' });
    const data = await parseXMind(buffer);
    // range 仍然正确解析，title 为 undefined（容错）
    expect(data.sheets[0].summaries![0].range).toEqual(['a', 'b']);
  });
});
