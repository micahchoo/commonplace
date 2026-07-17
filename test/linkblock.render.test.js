import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import LinkBlock from '../src/components/renderers/LinkBlock.svelte';

// A link block is presented as: the page framed on the left (only when the site allows
// framing) plus a preview card on the right that ALWAYS carries the "open in new tab"
// link. A known framing-refuser gets NO iframe — the browser would otherwise paint its
// own error page over the stage — so the left area stays blank white (ISSUES I5).
describe('LinkBlock render', () => {
  let app;
  afterEach(() => { if (app) unmount(app); app = null; document.body.innerHTML = ''; });

  it('frames a framable url and always shows the open-in-new-tab card', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(LinkBlock, { target, props: { block: { title: 'L', link: { url: 'https://example.com/x' } } } });
    const frame = target.querySelector('iframe');
    expect(frame.getAttribute('src')).toBe('https://example.com/x');
    const open = target.querySelector('a.open');
    expect(open).toBeTruthy();
    expect(open.getAttribute('href')).toBe('https://example.com/x');
    expect(open.getAttribute('target')).toBe('_blank');
    expect(target.querySelector('.host').textContent).toBe('example.com');
  });

  it('renders NO iframe for a known refuser, leaving the stage blank behind the card', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(LinkBlock, { target, props: { block: { title: 'N', link: { url: 'https://www.nytimes.com/2020/article' } } } });
    expect(target.querySelector('iframe')).toBeNull();
    const open = target.querySelector('a.open');
    expect(open.getAttribute('href')).toBe('https://www.nytimes.com/2020/article');
  });
});
