import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ChannelOpener from '../src/components/ChannelOpener.svelte';

function typeAndSubmit(target, value) {
  const input = target.querySelector('input');
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  flushSync();
  target.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

describe('ChannelOpener', () => {
  let app;
  afterEach(() => { if (app) unmount(app); app = null; });

  it('emits the extracted slug from a full are.na URL', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const opened = [];
    app = mount(ChannelOpener, { target, props: { onopen: (s) => opened.push(s) } });
    typeAndSubmit(target, 'https://www.are.na/someone/my-channel-abc');
    expect(opened).toEqual(['my-channel-abc']);
  });

  it('emits a bare slug unchanged and ignores empty input', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const opened = [];
    app = mount(ChannelOpener, { target, props: { onopen: (s) => opened.push(s) } });
    target.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(opened).toEqual([]); // empty → no emit
    typeAndSubmit(target, 'reading-room');
    expect(opened).toEqual(['reading-room']);
  });
});
