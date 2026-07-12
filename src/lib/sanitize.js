/**
 * Allowlist sanitizer for user-authored Text HTML (content.html). Text often
 * carries raw inline HTML from markdown, so allowlist rather than hand-strip.
 * NOTE: this is for Text ONLY. Embeds are NOT sanitized — their isolation comes
 * from the sandboxed null-origin iframe (sanitizing would strip the <iframe>/<script>
 * they need). See docs/research/arena-v3-field-confirmation.md.
 */
import DOMPurify from 'dompurify';

export function sanitizeHtml(html) {
  return DOMPurify.sanitize(html || '', { USE_PROFILES: { html: true } });
}
