import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import LinkBlock from '../src/components/renderers/LinkBlock.svelte';

// A framed link ALWAYS carries the "open in new tab" escape hatch — the safety net for
// any framing-refuser the denylist misses, which would otherwise paint a blank frame
// with no way out (ISSUES I5).
describe('LinkBlock render', () => {
  let app;
  afterEach(() => { if (app) unmount(app); app = null; document.body.innerHTML = ''; });

  it('frames the url and always shows the escape hatch', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(LinkBlock, { target, props: { block: { title: 'L', link: { url: 'https://example.com/x' } } } });
    const frame = target.querySelector('iframe');
    expect(frame.getAttribute('src')).toBe('https://example.com/x');
    const hatch = target.querySelector('a.hatch');
    expect(hatch).toBeTruthy();
    expect(hatch.getAttribute('href')).toBe('https://example.com/x');
    expect(hatch.getAttribute('target')).toBe('_blank');
  });
});
