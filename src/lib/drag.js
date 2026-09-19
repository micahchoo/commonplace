/**
 * `use:drag` — makes the panel draggable with native Pointer Events (replacing
 * jQuery-UI + touch-punch). The drag handle is a child marked [data-drag-handle]
 * (falls back to the node). `touch-action: none` on the handle stops wide touch
 * devices from stealing the gesture as scroll. Disabled ≤768px (matches the CSS
 * breakpoint); clicks on controls (buttons/links) are not drags. The position is
 * clamped to the viewport: the header is the only handle, so a box dragged off the
 * edge took its own way back with it.
 */

import { isMobile } from './viewport.js';

const EDGE = 24; // px of the box that must stay on screen

export function drag(node) {
  const handle = node.querySelector('[data-drag-handle]') || node;
  handle.style.touchAction = 'none';

  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;

  function onDown(e) {
    if (isMobile()) return;
    if (e.target.closest('button, a, input, select, textarea')) return; // controls aren't drags
    pointerId = e.pointerId;
    const rect = node.getBoundingClientRect();
    originX = rect.left;
    originY = rect.top;
    startX = e.clientX;
    startY = e.clientY;
    // pin by top/left so the drag math is absolute
    node.style.left = `${originX}px`;
    node.style.top = `${originY}px`;
    node.style.right = 'auto';
    node.style.bottom = 'auto';
    handle.setPointerCapture?.(pointerId);
    e.preventDefault();
  }

  /** Keep `EDGE` px of the box — and all of the header's top edge — reachable. */
  function clampTo(x, y) {
    const rect = node.getBoundingClientRect();
    return [
      Math.min(Math.max(x, EDGE - rect.width), window.innerWidth - EDGE),
      Math.min(Math.max(y, 0), window.innerHeight - EDGE),
    ];
  }

  function onMove(e) {
    if (pointerId === null || e.pointerId !== pointerId) return;
    const [x, y] = clampTo(originX + (e.clientX - startX), originY + (e.clientY - startY));
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
  }

  /**
   * A resize can strand a dragged box outside the new viewport. Narrowing into the
   * mobile layout is worse: the inline left/top set here beats the stylesheet, so
   * the pinned top bar never forms. Drop the inline position there and re-clamp
   * everywhere else.
   */
  function onResize() {
    if (!node.style.left) return; // never dragged — the stylesheet owns the position
    if (isMobile()) {
      node.style.left = node.style.top = node.style.right = node.style.bottom = '';
      return;
    }
    const [x, y] = clampTo(parseFloat(node.style.left) || 0, parseFloat(node.style.top) || 0);
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
  }

  function onUp() {
    if (pointerId === null) return;
    try {
      handle.releasePointerCapture?.(pointerId);
    } catch {
      /* ignore */
    }
    pointerId = null;
  }

  handle.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('resize', onResize);

  return {
    destroy() {
      handle.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', onResize);
    },
  };
}
