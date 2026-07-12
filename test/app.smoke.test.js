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
    expect(document.title).toBe('Test Site');
    expect(target.textContent).toContain('Sitterwerk'); // first block label in the index
    // auto-entered the first section → breadcrumb shows it (not the root sections list)
    expect(target.querySelector('.at-crumbs')?.textContent).toContain('Arena Influences');
    // the nested Channel block renders as a drill node with its count
    expect(target.textContent).toContain('>ch 33');
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
