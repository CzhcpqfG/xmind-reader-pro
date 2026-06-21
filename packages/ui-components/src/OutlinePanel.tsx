import React from 'react';
import { useMindMapStore } from './store';

export const OutlinePanel: React.FC = () => {
  const data = useMindMapStore((s) => s.data);
  const activeSheetIndex = useMindMapStore((s) => s.activeSheetIndex);
  const selectedNodeId = useMindMapStore((s) => s.selectedNodeId);
  const selectNode = useMindMapStore((s) => s.selectNode);

  if (!data) return null;
  const sheet = data.sheets[activeSheetIndex];

  const renderNode = (node: any, depth: number = 0): React.ReactNode => (
    <div key={node.id} style={{ paddingLeft: depth * 16 }}>
      <div
        style={{
          padding: '4px 8px',
          cursor: 'pointer',
          background: node.id === selectedNodeId ? '#e3f2fd' : 'transparent',
          borderRadius: 4,
          fontSize: 13,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        onClick={() => selectNode(node.id)}
      >
        {node.title}
      </div>
      {node.children?.map((child: any) => renderNode(child, depth + 1))}
      {node.detachedChildren?.map((child: any) => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <div style={{ width: 240, borderRight: '1px solid #e0e0e0', overflow: 'auto', padding: 8 }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#666' }}>大纲</h3>
      {renderNode(sheet?.rootTopic)}
    </div>
  );
};
