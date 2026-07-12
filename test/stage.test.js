import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import Stage from '../src/components/Stage.svelte';

// Verifies Stage dispatches every kind to its renderer (the wiring the reviewer
// flagged as a blocker) and that a denylisted Link shows a card instead of an iframe.
function render(block) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(Stage, { target, props: { block } });
  return { target, app };
}

describe('Stage dispatch', () => {
  let app;
  beforeEach(() => {
    window.matchMedia =
      window.matchMedia ||
      ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
  });
  afterEach(() => {
    if (app) unmount(app);
    app = null;
  });

  it('image → <img>', () => {
    let t;
    ({ target: t, app } = render({ id: 1, kind: 'image', title: 'i', image: { src: 'x.jpg' } }));
    expect(t.querySelector('img.at-image')).toBeTruthy();
  });

  it('text → sanitized {@html}', () => {
    let t;
    ({ target: t, app } = render({ id: 2, kind: 'text', title: 't', html: '<p>hello</p>' }));
    expect(t.querySelector('.at-text')?.innerHTML).toContain('<p>hello</p>');
  });

  it('embed → srcdoc iframe (not sanitized away)', () => {
    let t;
    ({ target: t, app } = render({ id: 3, kind: 'embed', title: 'e', embedHtml: '<iframe src="y"></iframe>' }));
    const f = t.querySelector('iframe.at-embed');
    expect(f).toBeTruthy();
    expect(f.getAttribute('srcdoc')).toContain('<iframe');
    expect(f.getAttribute('sandbox')).toContain('allow-scripts');
  });

  it('attachment pdf (desktop) → iframe', () => {
    let t;
    ({ target: t, app } = render({
      id: 4,
      kind: 'attachment',
      title: 'a',
      attachment: { url: 'z.pdf', contentType: 'application/pdf' },
    }));
    expect(t.querySelector('iframe.at-attachment')).toBeTruthy();
  });

  it('framable link → iframe, no card', () => {
    let t;
    ({ target: t, app } = render({ id: 5, kind: 'link', title: 'l', link: { url: 'https://example.com/x' } }));
    expect(t.querySelector('.at-link iframe')).toBeTruthy();
    expect(t.querySelector('.at-fallback')).toBeFalsy();
  });

  it('denylisted link → fallback card, no iframe', () => {
    let t;
    ({ target: t, app } = render({ id: 6, kind: 'link', title: 'l', link: { url: 'https://www.nytimes.com/x' } }));
    expect(t.querySelector('.at-fallback')).toBeTruthy();
    expect(t.querySelector('.at-link iframe')).toBeFalsy();
  });
});
