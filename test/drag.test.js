import { describe, it, expect, afterEach } from 'vitest';
import { drag } from '../src/lib/drag.js';

// drag.js is a native Pointer-Events state machine with no test net (ISSUES I5):
// pointer capture, the desktop-only guard, and the "controls aren't drags" rule.
// jsdom gives zeroed getBoundingClientRect (origin 0,0) and no matchMedia unless we
// define it, so desktop is the default and we opt into mobile explicitly.

function makeNode() {
  const node = document.createElement('div');
  const handle = document.createElement('div');
  handle.setAttribute('data-drag-handle', '');
  const btn = document.createElement('button');
  handle.appendChild(btn);
  node.appendChild(handle);
  document.body.appendChild(node);
  return { node, handle, btn };
}

const evt = (type, props) => Object.assign(new Event(type, { bubbles: true }), props);

describe('drag', () => {
  let action;
  afterEach(() => {
    if (action?.destroy) action.destroy();
    action = null;
    document.body.innerHTML = '';
    delete window.matchMedia;
  });

  it('pins and moves the node by the pointer delta (desktop)', () => {
    const { node, handle } = makeNode();
    action = drag(node);
    handle.dispatchEvent(evt('pointerdown', { pointerId: 1, clientX: 100, clientY: 50 }));
    window.dispatchEvent(evt('pointermove', { pointerId: 1, clientX: 130, clientY: 70 }));
    expect(node.style.left).toBe('30px'); // origin 0 + (130-100)
    expect(node.style.top).toBe('20px'); // origin 0 + (70-50)
    expect(node.style.right).toBe('auto'); // pinned by top/left
  });

  it('ignores a pointerdown on a control (buttons/links are not drags)', () => {
    const { node, btn } = makeNode();
    action = drag(node);
    btn.dispatchEvent(evt('pointerdown', { pointerId: 1, clientX: 100, clientY: 50 }));
    window.dispatchEvent(evt('pointermove', { pointerId: 1, clientX: 130, clientY: 70 }));
    expect(node.style.left).toBe(''); // never started
  });

  it('is disabled on mobile (≤768px)', () => {
    window.matchMedia = () => ({ matches: true });
    const { node, handle } = makeNode();
    action = drag(node);
    handle.dispatchEvent(evt('pointerdown', { pointerId: 1, clientX: 100, clientY: 50 }));
    window.dispatchEvent(evt('pointermove', { pointerId: 1, clientX: 130, clientY: 70 }));
    expect(node.style.left).toBe(''); // guard blocked it
  });

  it('a move with a different pointerId is ignored', () => {
    const { node, handle } = makeNode();
    action = drag(node);
    handle.dispatchEvent(evt('pointerdown', { pointerId: 1, clientX: 100, clientY: 50 }));
    window.dispatchEvent(evt('pointermove', { pointerId: 2, clientX: 130, clientY: 70 }));
    expect(node.style.left).toBe('0px'); // only the down's pin, no move applied
  });

  it('stops tracking after pointerup', () => {
    const { node, handle } = makeNode();
    action = drag(node);
    handle.dispatchEvent(evt('pointerdown', { pointerId: 1, clientX: 100, clientY: 50 }));
    window.dispatchEvent(evt('pointerup', { pointerId: 1 }));
    window.dispatchEvent(evt('pointermove', { pointerId: 1, clientX: 130, clientY: 70 }));
    expect(node.style.left).toBe('0px'); // released; the post-up move is dropped
  });

  it('clamps to the viewport so the handle cannot leave the screen', () => {
    const { node, handle } = makeNode();
    action = drag(node);
    handle.dispatchEvent(evt('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 }));
    // drag hard up and left, past the origin — this used to strand the header off-screen
    window.dispatchEvent(evt('pointermove', { pointerId: 1, clientX: -900, clientY: -900 }));
    expect(node.style.top).toBe('0px'); // the header's top edge stays on screen
    expect(parseFloat(node.style.left)).toBeGreaterThanOrEqual(24 - node.getBoundingClientRect().width);
    // ...and just as far the other way
    window.dispatchEvent(evt('pointermove', { pointerId: 1, clientX: 9000, clientY: 9000 }));
    expect(parseFloat(node.style.left)).toBe(window.innerWidth - 24);
    expect(parseFloat(node.style.top)).toBe(window.innerHeight - 24);
  });

  it('a resize into the mobile layout drops the inline position back to the stylesheet', () => {
    const { node, handle } = makeNode();
    action = drag(node);
    handle.dispatchEvent(evt('pointerdown', { pointerId: 1, clientX: 100, clientY: 50 }));
    window.dispatchEvent(evt('pointermove', { pointerId: 1, clientX: 130, clientY: 70 }));
    expect(node.style.left).toBe('30px');
    window.matchMedia = () => ({ matches: true }); // narrowed past the breakpoint
    window.dispatchEvent(new Event('resize'));
    expect(node.style.left).toBe(''); // inline styles beat the media query — so clear them
    expect(node.style.top).toBe('');
  });

  it('destroy() removes the listeners', () => {
    const { node, handle } = makeNode();
    action = drag(node);
    action.destroy();
    action = null;
    handle.dispatchEvent(evt('pointerdown', { pointerId: 1, clientX: 100, clientY: 50 }));
    window.dispatchEvent(evt('pointermove', { pointerId: 1, clientX: 130, clientY: 70 }));
    expect(node.style.left).toBe(''); // handler gone, nothing happens
  });
});
