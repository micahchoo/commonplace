/**
 * The mobile breakpoint, once.
 *
 * 768px is one fact with nine readers: six `@media` blocks that must keep their
 * literal (CSS cannot import a JS constant) and three scripts that must not drift
 * from them — the panel's collapsed default, the drag guard, and the PDF renderer's
 * iOS fallback. Same class of invariant as `DEPTH_CAP`: one exported constant,
 * never a re-declared literal.
 *
 * If you change the number here, change it in the `@media (max-width: 768px)`
 * blocks too (global.css, Panel, Stage, ImageBlock, EmbedBlock, LinkBlock).
 */
export const MOBILE_QUERY = '(max-width: 768px)';

/** True when the viewport is at or below the mobile breakpoint. False without a DOM. */
export function isMobile() {
  return typeof window !== 'undefined' && !!window.matchMedia?.(MOBILE_QUERY).matches;
}

/**
 * Call `on(matches)` now and on every crossing of the breakpoint; returns a
 * teardown. For a component that must re-render on the change rather than read
 * it once (AttachmentBlock's PDF-vs-download fork).
 */
export function watchMobile(on) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(MOBILE_QUERY);
  const handler = () => on(mq.matches);
  on(mq.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
