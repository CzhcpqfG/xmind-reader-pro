import type { MindMapNode } from '../types/index';

export function flattenTree(node: MindMapNode): MindMapNode[] {
  const result: MindMapNode[] = [node];
  for (const child of node.children) {
    result.push(...flattenTree(child));
  }
  if (node.detachedChildren) {
    for (const child of node.detachedChildren) {
      result.push(...flattenTree(child));
    }
  }
  return result;
}

export function findNodeById(node: MindMapNode, id: string): MindMapNode | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  if (node.detachedChildren) {
    for (const child of node.detachedChildren) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function getNodePath(node: MindMapNode, targetId: string, path: MindMapNode[] = []): MindMapNode[] | null {
  const currentPath = [...path, node];
  if (node.id === targetId) return currentPath;
  for (const child of node.children) {
    const found = getNodePath(child, targetId, currentPath);
    if (found) return found;
  }
  if (node.detachedChildren) {
    for (const child of node.detachedChildren) {
      const found = getNodePath(child, targetId, currentPath);
      if (found) return found;
    }
  }
  return null;
}

export function countNodes(node: MindMapNode): number {
  let count = 1;
  for (const child of node.children) {
    count += countNodes(child);
  }
  if (node.detachedChildren) {
    for (const child of node.detachedChildren) {
      count += countNodes(child);
    }
  }
  return count;
}

export function getMaxDepth(node: MindMapNode, currentDepth = 0): number {
  let maxChildDepth = currentDepth;
  for (const child of node.children) {
    maxChildDepth = Math.max(maxChildDepth, getMaxDepth(child, currentDepth + 1));
  }
  return maxChildDepth;
}
