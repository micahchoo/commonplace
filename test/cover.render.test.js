import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import Cover from '../src/components/Cover.svelte';

describe('Cover render', () => {
  let app;
  afterEach(() => { if (app) unmount(app); app = null; });

  it('renders the thumbnail grid and fires onpick with the block', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const picks = [];
    app = mount(Cover, {
      target,
      props: {
        title: 'N', about: 'a',
        thumbs: [
          { id: 1, slug: 's', thumb: 't.jpg', title: 'x' },
          { id: 2, slug: 's', thumb: 'u.jpg', title: 'y' },
        ],
        onpick: (t) => picks.push(t),
      },
    });
    expect(target.querySelectorAll('.at-grid img').length).toBe(2);
    target.querySelector('.at-grid button').click();
    expect(picks[0].id).toBe(1);
  });

  it('falls back to a typographic cover when there are no thumbnails', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(Cover, { target, props: { title: 'My Notebook', about: '', thumbs: [] } });
    expect(target.querySelector('.at-grid')).toBeNull();
    expect(target.textContent).toContain('My Notebook');
    expect(target.textContent).toContain('Select a channel to begin');
  });
});
