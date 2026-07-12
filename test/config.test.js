import { describe, it, expect, vi } from 'vitest';
import { resolveConfig } from '../src/lib/config.js';

describe('resolveConfig', () => {
  it('?channels= wins over config.json', async () => {
    const fetchJson = vi.fn(async () => ({ channels: ['from-config'] }));
    const r = await resolveConfig('?channels=a,b', fetchJson);
    expect(r.source).toBe('params');
    expect(r.channels).toEqual(['a', 'b']);
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it('normalizes are.na URLs in params to slugs', async () => {
    const r = await resolveConfig('?channel=https://www.are.na/x/reading-room', async () => {
      throw new Error('no config');
    });
    expect(r.channels).toEqual(['reading-room']);
  });

  it('falls back to config.json when no params', async () => {
    const fetchJson = vi.fn(async () => ({ title: 'My Site', channels: ['reading-room', 'field-work'] }));
    const r = await resolveConfig('', fetchJson);
    expect(r.source).toBe('config');
    expect(r.title).toBe('My Site');
    expect(r.channels).toEqual(['reading-room', 'field-work']);
  });

  it('returns empty (never throws) when config missing and no params', async () => {
    const r = await resolveConfig('', async () => {
      throw new Error('404');
    });
    expect(r.source).toBe('empty');
    expect(r.channels).toEqual([]);
  });
});
