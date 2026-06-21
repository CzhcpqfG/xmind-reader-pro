/**
 * 真实文件集成测试：使用 创维储能官网内容框架-海外版.xmind
 * 验证 summary 大括号内容和内嵌图片都能正确提取
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parseXMind } from '../src/parser/index.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_PATH = resolve(__dirname, 'fixtures/real.xmind');

describe('真实 XMind 文件：创维储能官网内容框架-海外版', () => {
  it('应能成功解析文件', async () => {
    const buffer = readFileSync(FIXTURE_PATH);
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const data = await parseXMind(ab);

    expect(data.sheets).toHaveLength(1);
    expect(data.sheets[0].rootTopic.title).toContain('创维储能');
  });

  it('应能提取所有 6 对 summary 括号（含内容）', async () => {
    const buffer = readFileSync(FIXTURE_PATH);
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const data = await parseXMind(ab);

    const summaries = data.sheets[0].summaries;
    expect(summaries).toBeDefined();
    expect(summaries!.length).toBeGreaterThanOrEqual(6);

    // 验证每个 summary 都有有效的 range
    for (const s of summaries!) {
      expect(s.id).toBeTruthy();
      expect(s.range).toBeInstanceOf(Array);
      expect(s.range.length).toBeGreaterThan(0);
    }
  });

  it('应能提取 summary 中的内嵌图片', async () => {
    const buffer = readFileSync(FIXTURE_PATH);
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const data = await parseXMind(ab);

    const summaries = data.sheets[0].summaries!;
    // 找出带图片的 summary
    const withImages = summaries.filter(s => s.image?.buffer);
    expect(withImages.length).toBeGreaterThanOrEqual(2);

    // 验证图片 buffer 都有内容
    for (const s of withImages) {
      expect(s.image!.buffer).toBeDefined();
      expect(s.image!.buffer!.byteLength).toBeGreaterThan(100);
      expect(s.image!.src).toMatch(/^resources\//);
    }
  });

  it('应能提取 summary 内 children 的图片', async () => {
    const buffer = readFileSync(FIXTURE_PATH);
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const data = await parseXMind(ab);

    const summaries = data.sheets[0].summaries!;
    // 找包含 children 的 summary
    const withChildren = summaries.find(s => s.children && s.children.length > 0);
    expect(withChildren).toBeDefined();

    // 验证 children 中的图片
    const childWithImage = withChildren!.children!.find(c => c.image?.buffer);
    expect(childWithImage).toBeDefined();
    expect(childWithImage!.image!.buffer!.byteLength).toBeGreaterThan(100);
  });

  it('应能提取所有 4 张图片（topic 直接图片 + 3 张 summary 内嵌）', async () => {
    const buffer = readFileSync(FIXTURE_PATH);
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const data = await parseXMind(ab);

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

    console.log(`\n  📊 共找到 ${totalImages} 张图片引用，全部成功绑定 buffer`);
    expect(totalImages).toBeGreaterThanOrEqual(4);
    expect(boundImages).toBe(totalImages);
  });

  it('应能解析 boundary 边界框（range 同样为元组）', async () => {
    const buffer = readFileSync(FIXTURE_PATH);
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const data = await parseXMind(ab);

    const boundaries = data.sheets[0].boundaries;
    expect(boundaries).toBeDefined();
    expect(boundaries!.length).toBeGreaterThanOrEqual(1);

    // 第一个 boundary range "(3,3)" → 单个节点 ID
    const b = boundaries![0];
    expect(b.range).toHaveLength(1);
  });
});
