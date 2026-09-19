import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import App from '../src/App.svelte';
import channel from './fixtures/v3-channel.json';
import contents from './fixtures/v3-contents.json';

// End-to-end skeleton check (Wave 1 Task 7 verify, headless): boot the real App
// against a mocked fetch and assert config → fetch → normalize → nav + landing.
describe('App skeleton', () => {
  let app;

  beforeEach(() => {
    const ok = (b) => ({ ok: true, status: 200, json: async () => b });
    global.fetch = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes('config.json')) return ok({ title: 'Test Site', channels: ['arena-influences'] });
      if (u.includes('/contents')) return ok(contents);
      if (u.includes('/channels/arena-influences')) return ok(channel);
      return { ok: false, status: 404, json: async () => ({}) };
    });
    window.location.hash = '';
  });

  afterEach(() => {
    if (app) unmount(app);
    app = null;
  });

  it('boots, lists the 6 blocks, lands on the first image, sets the title', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(App, { target });

    await vi.waitFor(() => {
      expect(target.querySelectorAll('.at-navlist li').length).toBe(6);
    });

    expect(target.querySelector('.at-image')).toBeTruthy(); // landing = first Image
    // Per-view title: block — channel — site, so two deep links are distinguishable
    // in history, in a bookmark and in the tab strip.
    expect(document.title).toBe('Sitterwerk, Dynamic Order, 2006 — Arena Influences — Test Site');
    expect(target.textContent).toContain('Sitterwerk'); // first block label in the index
    // auto-entered the first section → breadcrumb shows it (not the root sections list)
    expect(target.querySelector('.at-crumbs')?.textContent).toContain('Arena Influences');
    // the nested Channel block renders as a drill node with its count
    expect(target.textContent).toContain('>ch 33');
  });

  it('with several sections and an empty hash, lands on the home Cover — not the first channel (ISSUES I6)', async () => {
    const ok = (b) => ({ ok: true, status: 200, json: async () => b });
    global.fetch = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes('config.json')) return ok({ title: 'Two', channels: ['arena-influences', 'second-one'] });
      if (u.includes('/contents')) return ok(contents);
      if (u.includes('/channels/')) return ok({ ...channel, slug: u.split('/channels/')[1].split(/[?/]/)[0] });
      return { ok: false, status: 404, json: async () => ({}) };
    });
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(App, { target });

    await vi.waitFor(() => {
      // root: the two sections are the nav entries, and no channel was auto-entered
      expect(target.querySelectorAll('.at-navlist li').length).toBe(2);
    });
    expect(target.querySelector('.at-cover, .at-grid')).toBeTruthy(); // the home Cover is showing
    expect(window.location.hash).toBe(''); // stayed at root, no replaceState into a channel
  });

  it('arrow keys page through the channel without the pointer', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(App, { target });
    await vi.waitFor(() => expect(target.querySelector('.at-image')).toBeTruthy());

    const key = (k) =>
      window.dispatchEvent(new KeyboardEvent('keydown', { key: k, cancelable: true, bubbles: true }));

    // Wait on the rendered stage, not the hash: the hash moves synchronously but the
    // block it names is only open once the hashchange sync has landed.
    key('ArrowRight'); // image → the next openable block (the Text; the drill node is skipped)
    await vi.waitFor(() => expect(target.querySelector('.at-text')).toBeTruthy());
    expect(window.location.hash).toContain('b:4929062');

    key('ArrowLeft');
    await vi.waitFor(() => expect(target.querySelector('.at-image')).toBeTruthy());
    expect(window.location.hash).toContain('b:9613792');
  });

  it('Escape backs out of the channel to the root index', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(App, { target });
    await vi.waitFor(() => expect(target.querySelectorAll('.at-navlist li').length).toBe(6));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true }));
    await vi.waitFor(() => expect(target.querySelectorAll('.at-navlist li').length).toBe(1)); // the lone section
  });

  it('a deep link to a block beyond page 1 opens it instead of a blank stage', async () => {
    const ok = (b) => ({ ok: true, status: 200, json: async () => b });
    const page2 = {
      data: [
        {
          id: 777001,
          type: 'Text',
          title: 'Page two note',
          state: 'available',
          content: { html: '<p>Page two note</p>', plain: 'Page two note' },
        },
      ],
      meta: { current_page: 2, next_page: null, has_more_pages: false },
    };
    global.fetch = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes('config.json')) return ok({ title: 'Test Site', channels: ['arena-influences'] });
      if (u.includes('/contents')) return ok(u.includes('page=2') ? page2 : contents);
      if (u.includes('/channels/arena-influences')) return ok(channel);
      return { ok: false, status: 404, json: async () => ({}) };
    });
    window.location.hash = '#arena-influences/b:777001'; // a shared link; page 1 holds 6 blocks

    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(App, { target });

    await vi.waitFor(() => {
      expect(target.querySelector('.at-text')?.textContent).toContain('Page two note');
    });
  });

  it('on mobile, picking a block closes the menu that was covering it', async () => {
    window.matchMedia = (q) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} });
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(App, { target });

    // .toggle only exists on the real panel — .at-panel alone also matches the boot skeleton.
    await vi.waitFor(() => expect(target.querySelector('.toggle')).toBeTruthy());
    expect(target.querySelector('.at-navlist')).toBeFalsy(); // starts collapsed on mobile

    target.querySelector('.toggle').click(); // maximize
    await vi.waitFor(() => expect(target.querySelector('.at-navlist')).toBeTruthy());

    target.querySelectorAll('.at-navlist button')[1].click(); // pick a block
    await vi.waitFor(() => expect(target.querySelector('.at-navlist')).toBeFalsy());
    delete window.matchMedia;
  });

  it('shows the configure-me empty state when no channels resolve', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(App, { target });
    await vi.waitFor(() => {
      expect(target.querySelector('.at-empty')).toBeTruthy();
    });
    expect(target.textContent).toContain('Configure me');
  });
});
