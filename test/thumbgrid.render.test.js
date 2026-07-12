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

  it('empty thumbs -> empty grid, no crash', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(ThumbGrid, { target, props: { thumbs: [] } });
    expect(target.querySelectorAll('.at-grid button').length).toBe(0);
  });
});
