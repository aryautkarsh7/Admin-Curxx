import { describe, expect, it } from 'vitest';
import { cell, money } from '../src/app/core/format';
import { RESOURCES, optionsFor } from '../src/app/core/resources';

describe('admin resource configuration', () => {
  it('gives every resource an identity and filters for configured fields', () => {
    for (const resource of RESOURCES) {
      expect(resource.name).not.toBe('');
      expect(resource.label).not.toBe('');
      expect(['slug', 'id']).toContain(resource.key);

      const fields = new Set([
        resource.key,
        'source',
        ...resource.columns.map((column) => column.key),
        ...resource.sections.flatMap((section) => section.fields.map((field) => field.key)),
      ]);
      for (const filter of resource.filters) expect(fields.has(filter.key)).toBe(true);
    }
  });
});

describe('admin formatting helpers', () => {
  it('formats table values and static filter options without an API call', () => {
    expect(cell({ fee: 750 }, { key: 'fee', label: 'Fee', format: 'money' })).toBe('₹750');
    expect(money(125000)).toBe('₹1,25,000');
    expect(optionsFor({ static: ['new', { value: 'closed', label: 'Closed' }] }, null)).toEqual([
      { value: 'new', label: 'new' },
      { value: 'closed', label: 'Closed' },
    ]);
  });
});
