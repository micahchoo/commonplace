/**
 * `use:drag` — makes the panel draggable with native Pointer Events (replacing
 * jQuery-UI + touch-punch). The drag handle is a child marked [data-drag-handle]
 * (falls back to the node). `touch-action: none` on the handle stops wide touch
 * devices from stealing the gesture as scroll. Disabled ≤768px (matches the CSS
 * breakpoint); clicks on controls (buttons/links) are not drags.
 */
export function drag(node) {
  const handle = node.querySelector('[data-drag-handle]') || node;
  handle.style.touchAction = 'none';

  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;

  const isMobile = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(max-width: 768px)').matches;

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

  function onMove(e) {
    if (pointerId === null || e.pointerId !== pointerId) return;
    node.style.left = `${originX + (e.clientX - startX)}px`;
    node.style.top = `${originY + (e.clientY - startY)}px`;
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

  return {
    destroy() {
      handle.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    },
  };
}
