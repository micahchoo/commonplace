<script>
  // Paste an are.na channel link (or a bare slug) to open it at runtime — no config
  // edit needed. Emits the extracted slug; the app adds it as a section and navigates.
  import { extractSlug } from '../lib/model.js';
  let { onopen } = $props();
  let link = $state('');

  function submit(e) {
    e.preventDefault();
    const slug = extractSlug(link.trim());
    if (!slug) return;
    onopen?.(slug);
    link = '';
  }
</script>

<form class="at-opener" onsubmit={submit}>
  <input
    type="text"
    bind:value={link}
    placeholder="open an are.na channel…"
    aria-label="Open an Are.na channel by link or slug"
    autocomplete="off"
    spellcheck="false"
  />
  <button type="submit" aria-label="Open channel" disabled={!link.trim()}>→</button>
</form>

<style>
  .at-opener {
    display: flex;
    gap: 4px;
    margin-top: 10px;
  }
  .at-opener input {
    flex: 1 1 auto;
    min-width: 0;
    background: #fff;
    border: 1px solid var(--an-border);
    padding: 3px 6px;
    font: 12px/1.3 var(--an-font);
    color: var(--an-text);
  }
  .at-opener button {
    flex: 0 0 auto;
    background: none;
    border: 1px solid var(--an-border);
    color: var(--an-accent);
    font: inherit;
    padding: 0 9px;
    cursor: pointer;
  }
  .at-opener button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
