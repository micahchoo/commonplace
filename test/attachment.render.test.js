import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import AttachmentBlock from '../src/components/renderers/AttachmentBlock.svelte';

// The content-type × device fork (ISSUES I5): PDF inlines on desktop but degrades to a
// download card on mobile (iOS can't scroll an iframed PDF); video/audio render natively.
// jsdom has no matchMedia, so desktop is the default; mobile is opted into per test.
// flushSync runs the $effect that reads matchMedia before we assert on the DOM.
const mountWith = (target, block) => {
  const app = mount(AttachmentBlock, { target, props: { block } });
  flushSync();
  return app;
};
const att = (contentType, extra = {}) => ({ title: 'f', attachment: { url: 'f', contentType, ...extra } });

describe('AttachmentBlock render', () => {
  let app;
  const target = () => {
    const t = document.createElement('div');
    document.body.appendChild(t);
    return t;
  };
  afterEach(() => {
    if (app) unmount(app);
    app = null;
    document.body.innerHTML = '';
    delete window.matchMedia;
  });

  it('inlines a PDF in an iframe on desktop', () => {
    const t = target();
    app = mountWith(t, att('application/pdf'));
    expect(t.querySelector('iframe.at-attachment')).toBeTruthy();
  });

  it('degrades a PDF to a card on mobile', () => {
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    const t = target();
    app = mountWith(t, att('application/pdf'));
    expect(t.querySelector('iframe.at-attachment')).toBeNull(); // FallbackCard instead
  });

  it('renders video natively', () => {
    const t = target();
    app = mountWith(t, att('video/mp4'));
    expect(t.querySelector('video.at-attachment')).toBeTruthy();
  });

  it('renders audio natively', () => {
    const t = target();
    app = mountWith(t, att('audio/mpeg'));
    expect(t.querySelector('audio')).toBeTruthy();
  });

  it('falls back to a card for an unhandled type', () => {
    const t = target();
    app = mountWith(t, att('application/zip'));
    expect(t.querySelector('iframe.at-attachment')).toBeNull();
    expect(t.querySelector('video, audio')).toBeNull();
  });
});
