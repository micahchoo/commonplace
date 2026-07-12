import { describe, it, expect } from 'vitest';
import contents from './fixtures/v3-contents.json';
import {
  normalizeBlock,
  deriveTitle,
  blockKind,
  isArenaChannelLink,
  extractSlug,
  isAvailable,
} from '../src/lib/model.js';

const byType = (t) => contents.data.find((b) => b.type === t);

describe('blockKind', () => {
  it('maps each V3 type to its kind', () => {
    expect(blockKind(byType('Image'))).toBe('image');
    expect(blockKind(byType('Text'))).toBe('text');
    expect(blockKind(byType('Link'))).toBe('link');
    expect(blockKind(byType('Embed'))).toBe('embed');
    expect(blockKind(byType('Attachment'))).toBe('attachment');
    expect(blockKind(byType('Channel'))).toBe('channel');
  });

  it('normalizes an are.na-channel Link to a drill node', () => {
    const link = { type: 'Link', source: { url: 'https://www.are.na/someone/my-channel' } };
    expect(blockKind(link)).toBe('channel');
  });

  it('keeps an external Link as a link', () => {
    const link = { type: 'Link', source: { url: 'https://example.com/page' } };
    expect(blockKind(link)).toBe('link');
  });

  it('returns unknown for an unrecognized type', () => {
    expect(blockKind({ type: 'Weird' })).toBe('unknown');
  });
});

describe('deriveTitle', () => {
  it('uses title when present', () => {
    expect(deriveTitle(byType('Image'))).toBe('Sitterwerk, Dynamic Order, 2006');
  });
  it('derives a Text label from content.plain (title is null)', () => {
    expect(byType('Text').title).toBeNull();
    expect(deriveTitle(byType('Text'))).toMatch(/Any fact becomes important/);
  });
  it('falls back to Untitled', () => {
    expect(deriveTitle({ type: 'Text' })).toBe('Untitled');
    expect(deriveTitle(null)).toBe('Untitled');
  });
});

describe('extractSlug', () => {
  it('pulls the slug from an are.na URL', () => {
    expect(extractSlug('https://www.are.na/charles/my-slug')).toBe('my-slug');
  });
  it('passes a bare slug through', () => {
    expect(extractSlug('reading-room')).toBe('reading-room');
  });
});

describe('isArenaChannelLink', () => {
  it('detects an are.na channel URL', () => {
    expect(isArenaChannelLink('https://www.are.na/x/chan')).toBe(true);
  });
  it('rejects a block URL and non-are.na URLs', () => {
    expect(isArenaChannelLink('https://www.are.na/block/123')).toBe(false);
    expect(isArenaChannelLink('https://example.com')).toBe(false);
    expect(isArenaChannelLink('')).toBe(false);
  });
});

describe('normalizeBlock', () => {
  it('Image → src + srcset + alt, never throws', () => {
    const n = normalizeBlock(byType('Image'));
    expect(n.kind).toBe('image');
    expect(n.image.src).toContain('http');
    expect(n.image.srcset).toContain('w');
  });

  it('Text → html', () => {
    const n = normalizeBlock(byType('Text'));
    expect(n.kind).toBe('text');
    expect(n.html).toContain('<p>');
  });

  it('Link → url + provider', () => {
    const n = normalizeBlock(byType('Link'));
    expect(n.kind).toBe('link');
    expect(n.link.url).toContain('mica.edu');
    expect(n.link.provider).toBe('www.mica.edu');
  });

  it('Embed → embedHtml (unsanitized) + type', () => {
    const n = normalizeBlock(byType('Embed'));
    expect(n.kind).toBe('embed');
    expect(n.embedHtml).toContain('<iframe');
    expect(n.embedType).toBe('video');
  });

  it('Attachment → url + contentType + ext', () => {
    const n = normalizeBlock(byType('Attachment'));
    expect(n.kind).toBe('attachment');
    expect(n.attachment.url).toContain('.pdf');
    expect(n.attachment.contentType).toBe('application/pdf');
    expect(n.attachment.ext).toBe('pdf');
  });

  it('Channel → slug + count', () => {
    const n = normalizeBlock(byType('Channel'));
    expect(n.kind).toBe('channel');
    expect(n.channelSlug).toBe('adam-curtis');
    expect(n.count).toBe(33);
  });

  it('malformed block → unknown, no throw', () => {
    expect(() => normalizeBlock(undefined)).not.toThrow();
    expect(normalizeBlock({ foo: 1 }).kind).toBe('unknown');
    expect(normalizeBlock({ foo: 1 }).title).toBe('Untitled');
  });
});

describe('isAvailable', () => {
  it('passes available blocks', () => {
    expect(isAvailable(byType('Image'))).toBe(true);
    expect(isAvailable({ state: 'private' })).toBe(false);
  });
});
