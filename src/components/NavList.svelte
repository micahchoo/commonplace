<script>
  // Numbered index with kind tags, drill counts, and a link! pre-warning.
  import { isDenylisted } from '../lib/denylist.js';
  import { kindTag } from '../lib/model.js';
  let { blocks = [], activeId = null, onselect } = $props();

  let listEl;
  const num = (i) => String(i + 1).padStart(2, '0');
  const refuser = (b) => b.kind === 'link' && isDenylisted(b.link?.url);
  const tag = (b) => (refuser(b) ? 'link!' : kindTag(b));
  // `link!` is too terse to read on its own — say what it warns about.
  const hint = (b) => (refuser(b) ? 'This site refuses framing — opens in a new tab' : undefined);

  // The panel body scrolls (max-height 55vh), so a deep link or a keyboard step to
  // block 87 highlighted a row that was off-screen inside the box. Keep it in view.
  $effect(() => {
    if (activeId == null || !listEl) return;
    listEl.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: 'nearest' });
  });
</script>

<ul class="at-navlist" bind:this={listEl}>
  {#each blocks as b, i (b.id)}
    <li>
      <button
        type="button"
        class:active={b.id === activeId}
        data-active={b.id === activeId}
        aria-current={b.id === activeId ? 'true' : undefined}
        title={hint(b)}
        onclick={() => onselect?.(b)}
      >
        <span class="num">{num(i)}</span>
        <span class="label">{b.title}</span>
        <span class="tag">{tag(b)}</span>
      </button>
    </li>
  {/each}
</ul>

<style>
  .at-navlist {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .at-navlist button {
    display: flex;
    gap: 6px;
    width: 100%;
    background: none;
    border: none;
    padding: 1px 0;
    cursor: pointer;
    text-align: left;
    color: var(--an-text);
    font: inherit;
    white-space: nowrap;
  }
  .at-navlist button:hover,
  .at-navlist button.active {
    color: var(--an-accent);
  }
  .num {
    opacity: 0.6;
  }
  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 26ch;
  }
  .tag {
    margin-left: auto;
    opacity: 0.7;
  }
</style>
