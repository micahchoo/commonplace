import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import NavList from '../src/components/NavList.svelte';

// The index is the app's only reader control, so its state has to be legible to a
// screen reader and reachable inside the panel's own scroll box.
const BLOCKS = [
  { id: 10, kind: 'text', title: 'T' },
  { id: 11, kind: 'image', title: 'I' },
  { id: 12, kind: 'link', title: 'NYT', link: { url: 'https://www.nytimes.com/x' } },
  { id: 13, kind: 'channel', title: 'Sub', count: 5 },
];

function render(props) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const app = mount(NavList, { target, props });
  flushSync();
  return { target, app };
}

describe('NavList', () => {
  let app;
  afterEach(() => {
    if (app) unmount(app);
    app = null;
    document.body.innerHTML = '';
  });

  it('marks the active row for assistive tech, not colour alone', () => {
    let t;
    ({ target: t, app } = render({ blocks: BLOCKS, activeId: 11 }));
    const rows = t.querySelectorAll('.at-navlist button');
    expect(rows[1].getAttribute('aria-current')).toBe('true');
    expect(rows[0].hasAttribute('aria-current')).toBe(false);
  });

  it('explains the terse link! tag in a tooltip', () => {
    let t;
    ({ target: t, app } = render({ blocks: BLOCKS }));
    const rows = t.querySelectorAll('.at-navlist button');
    expect(rows[2].textContent).toContain('link!');
    expect(rows[2].getAttribute('title')).toMatch(/refuses framing/i);
    expect(rows[1].hasAttribute('title')).toBe(false); // only the warning carries one
  });

  it('scrolls the active row into view (the panel body is its own scroll box)', () => {
    const seen = [];
    Element.prototype.scrollIntoView = function (opts) {
      seen.push([this.textContent.trim(), opts]);
    };
    ({ app } = render({ blocks: BLOCKS, activeId: 13 }));
    expect(seen).toHaveLength(1);
    expect(seen[0][0]).toContain('Sub');
    expect(seen[0][1]).toEqual({ block: 'nearest' });
    delete Element.prototype.scrollIntoView;
  });
});
