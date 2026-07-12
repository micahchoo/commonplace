import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import EmbedBlock from '../src/components/renderers/EmbedBlock.svelte';

// embedType frames the box (ISSUES D3): a rich embed gets a neutral, taller frame
// (.rich, white srcdoc bg); video/unknown stays cinematic (16:9, black).
const mountWith = (target, block) => mount(EmbedBlock, { target, props: { block } });
const embed = (embedType) => ({ title: 'e', embedHtml: '<iframe src="//x"></iframe>', embedType });

describe('EmbedBlock render', () => {
  let app;
  const target = () => {
    const t = document.createElement('div');
    document.body.appendChild(t);
    return t;
  };
  afterEach(() => { if (app) unmount(app); app = null; document.body.innerHTML = ''; });

  it('a rich embed gets the .rich frame with a white backdrop', () => {
    const t = target();
    app = mountWith(t, embed('rich'));
    const frame = t.querySelector('iframe.at-embed');
    expect(frame.classList.contains('rich')).toBe(true);
    expect(frame.getAttribute('srcdoc')).toContain('background:#fff');
  });

  it('a video embed stays cinematic (no .rich, black backdrop)', () => {
    const t = target();
    app = mountWith(t, embed('video'));
    const frame = t.querySelector('iframe.at-embed');
    expect(frame.classList.contains('rich')).toBe(false);
    expect(frame.getAttribute('srcdoc')).toContain('background:#000');
  });

  it('unknown/null type defaults to cinematic (unchanged behavior)', () => {
    const t = target();
    app = mountWith(t, embed(null));
    expect(t.querySelector('iframe.at-embed').classList.contains('rich')).toBe(false);
  });

  it('no embedHtml falls back to a card', () => {
    const t = target();
    app = mountWith(t, { title: 'e', embedHtml: '', embedType: 'rich' });
    expect(t.querySelector('iframe.at-embed')).toBeNull();
  });
});
