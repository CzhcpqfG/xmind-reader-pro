import type { MarkerInfo } from './types/index';

export interface MarkerDefinition {
  markerId: string;
  family: string;
  name: string;
  svgContent?: string;
}

const MARKER_FAMILIES: Record<string, string[]> = {
  priority: ['priority-1', 'priority-2', 'priority-3', 'priority-4', 'priority-5', 'priority-6', 'priority-7', 'priority-8', 'priority-9'],
  task: ['task-start', 'task-oct', 'task-quarter', 'task-3oct', 'task-half', 'task-5oct', 'task-3quar', 'task-7oct', 'task-done', 'task-pending'],
  smiley: ['smiley-laugh', 'smiley-smile', 'smiley-cry', 'smiley-surprise', 'smiley-boring', 'smiley-angry'],
  flag: ['flag-red', 'flag-orange', 'flag-yellow', 'flag-green', 'flag-blue', 'flag-purple', 'flag-gray', 'flag-black'],
  star: ['star-blue', 'star-orange', 'star-red', 'star-purple', 'star-green', 'star-yellow', 'star-gray', 'star-pink'],
  people: ['people-red', 'people-blue', 'people-green', 'people-yellow', 'people-purple', 'people-orange'],
  arrow: ['arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'arrow-refresh', 'arrow-cursor'],
  symbol: ['symbol-wrong', 'symbol-right', 'symbol-exclam', 'symbol-question', 'symbol-info', 'symbol-code', 'symbol-lock', 'symbol-key'],
  month: ['month-jan', 'month-feb', 'month-mar', 'month-apr', 'month-may', 'month-jun', 'month-jul', 'month-aug', 'month-sep', 'month-oct', 'month-nov', 'month-dec'],
  week: ['week-sun', 'week-mon', 'week-tue', 'week-wed', 'week-thu', 'week-fri', 'week-sat'],
};

export function resolveMarker(markerId: string): MarkerDefinition {
  const family = markerId.split('-')[0];
  const familyMarkers = MARKER_FAMILIES[family];
  const name = familyMarkers?.includes(markerId) ? markerId : markerId;

  return {
    markerId,
    family,
    name,
  };
}

export function getMarkerEmoji(markerId: string): string | undefined {
  const emojiMap: Record<string, string> = {
    'priority-1': '🔴', 'priority-2': '🟠', 'priority-3': '🟡',
    'priority-4': '🟢', 'priority-5': '🔵',
    'task-done': '✅', 'task-start': '🔵', 'task-pending': '⏳',
    'task-oct': '🕐', 'task-quarter': '🕑', 'task-half': '🕒',
    'smiley-laugh': '😄', 'smiley-smile': '🙂', 'smiley-cry': '😢',
    'smiley-surprise': '😮', 'smiley-boring': '😐', 'smiley-angry': '😠',
    'flag-red': '🚩', 'flag-green': '🟩',
    'star-red': '⭐', 'star-blue': '🌟',
    'people-red': '👤', 'people-blue': '👥',
    'arrow-up': '⬆️', 'arrow-down': '⬇️', 'arrow-left': '⬅️', 'arrow-right': '➡️',
    'symbol-wrong': '❌', 'symbol-right': '✅', 'symbol-exclam': '❗', 'symbol-question': '❓',
    'symbol-info': 'ℹ️',
  };
  return emojiMap[markerId];
}
