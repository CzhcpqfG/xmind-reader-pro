import React from 'react';
import { useMindMapStore } from './store';

export const SheetTabs: React.FC = () => {
  const data = useMindMapStore((s) => s.data);
  const activeSheetIndex = useMindMapStore((s) => s.activeSheetIndex);
  const setActiveSheet = useMindMapStore((s) => s.setActiveSheet);

  if (!data || data.sheets.length <= 1) return null;

  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e0e0e0', background: '#f5f5f5' }}>
      {data.sheets.map((sheet, index) => (
        <button
          key={sheet.id}
          onClick={() => setActiveSheet(index)}
          style={{
            padding: '6px 16px',
            border: 'none',
            borderBottom: index === activeSheetIndex ? '2px solid #4285f4' : '2px solid transparent',
            background: index === activeSheetIndex ? '#fff' : 'transparent',
            cursor: 'pointer',
            fontSize: 13,
            color: index === activeSheetIndex ? '#333' : '#666',
          }}
        >
          {sheet.title}
        </button>
      ))}
    </div>
  );
};
