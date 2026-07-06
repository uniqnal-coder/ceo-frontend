import { describe, it, expect } from 'vitest';
import { toArray, API_URL } from './client';

describe('api client helpers', () => {
  it('toArray passes plain arrays through', () => {
    expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('toArray unwraps paginated { data } envelopes', () => {
    expect(toArray({ data: [{ id: 1 }], pagination: { page: 1 } })).toEqual([{ id: 1 }]);
  });

  it('toArray returns [] for null/objects without data', () => {
    expect(toArray(null)).toEqual([]);
    expect(toArray({ foo: 'bar' })).toEqual([]);
  });

  it('API_URL has no trailing slash', () => {
    expect(API_URL.endsWith('/')).toBe(false);
  });
});
