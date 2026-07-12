/**
 * Apply a config.theme override onto the signature CSS custom properties. The
 * defaults live in global.css :root; this only overrides. config.json is the
 * self-hoster's own same-origin file (trusted), but values are shape-validated to
 * avoid silent layout breakage / stray CSS injection.
 */
const TOKENS = {
  'panel-bg': '--an-panel-bg',
  border: '--an-border',
  'shadow-1': '--an-shadow-1',
  'shadow-2': '--an-shadow-2',
  font: '--an-font',
  text: '--an-text',
  accent: '--an-accent',
};

/** Reject values with CSS-breaking characters or absurd length. */
export function isValidToken(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length < 64 && !/[{}<>;]/.test(value);
}

export function applyTheme(theme, root = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!theme || typeof theme !== 'object' || !root) return;
  for (const [key, cssVar] of Object.entries(TOKENS)) {
    const value = theme[key];
    if (value != null && isValidToken(value)) root.style.setProperty(cssVar, value);
  }
}
