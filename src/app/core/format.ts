import type { Column } from './resources';
import { getPath } from './resources';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Table cell text for a column. */
export function cell(doc: Record<string, any>, column: Column): string {
  const value = getPath(doc, column.key);
  if (value === undefined || value === null || value === '') return '—';
  switch (column.format) {
    case 'money':
      return typeof value === 'number' ? (value === 0 ? 'Free' : inr(value)) : String(value);
    case 'date':
      return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    case 'datetime':
      return new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    case 'bool':
      return value ? 'Yes' : 'No';
    case 'stars':
      return typeof value === 'number' ? `${value.toFixed(1)} ★` : String(value);
    default:
      return Array.isArray(value) ? value.join(', ') : String(value);
  }
}

export const money = inr;
