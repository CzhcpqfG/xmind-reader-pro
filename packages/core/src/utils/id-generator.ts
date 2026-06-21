let counter = 0;

export function generateId(prefix = 'node'): string {
  return `${prefix}-${Date.now()}-${counter++}`;
}

export function resetCounter(): void {
  counter = 0;
}
