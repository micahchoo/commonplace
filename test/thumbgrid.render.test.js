import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import ThumbGrid from '../src/components/ThumbGrid.svelte';

describe('ThumbGrid render', () => {
  let app;
  afterEach(() => { if (app) unmount(app); app = null; });

  it('renders one clickable tile per thumb and reports the picked one', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const picks = [];
    app = mount(ThumbGrid, {
      target,
      props: {
        thumbs: [
          { id: 10, slug: 'a', thumb: 'a.jpg', title: 'A' },
          { id: 11, slug: 'a', thumb: 'b.jpg', title: 'B' },
          { id: 12, slug: 'a', thumb: 'c.jpg', title: 'C' },
        ],
        onpick: (t) => picks.push(t.id),
      },
    });
    const tiles = target.querySelectorAll('.at-grid button');
    expect(tiles.length).toBe(3);
    tiles[2].click();
    expect(picks).toEqual([12]);
  });

  it('an entry with no image keeps its place as a typographic tile', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(ThumbGrid, {
      target,
      props: {
        thumbs: [
          { id: 10, slug: 'a', thumb: 'a.jpg', title: 'A', kind: 'image' },
          { id: 11, slug: 'a', thumb: '', title: 'A note', kind: 'text' },
          { id: 12, slug: 'a', thumb: '', title: 'Sub', kind: 'channel', count: 5 },
        ],
      },
    });
    const tiles = target.querySelectorAll('.at-grid button');
    expect(tiles.length).toBe(3); // the sheet is the whole channel, not just its images
    expect(tiles[0].querySelector('img')).toBeTruthy();
    expect(tiles[1].querySelector('.tile')?.textContent).toContain('[text]');
    expect(tiles[1].textContent).toContain('A note');
    expect(tiles[2].textContent).toContain('>ch 5');
  });

  it('marks the open block in the sheet', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(ThumbGrid, {
      target,
      props: {
        thumbs: [
          { id: 10, slug: 'a', thumb: 'a.jpg', title: 'A' },
          { id: 11, slug: 'a', thumb: 'b.jpg', title: 'B' },
        ],
        activeId: 11,
      },
    });
    const tiles = target.querySelectorAll('.at-grid button');
    expect(tiles[1].classList.contains('active')).toBe(true);
    expect(tiles[1].getAttribute('aria-current')).toBe('true');
    expect(tiles[0].classList.contains('active')).toBe(false);
  });

  it('empty thumbs -> empty grid, no crash', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(ThumbGrid, { target, props: { thumbs: [] } });
    expect(target.querySelectorAll('.at-grid button').length).toBe(0);
  });
});
