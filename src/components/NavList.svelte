<script>
  // Plain numbered index (Wave 1). Task 17 adds link! glyphs / polish.
  let { blocks = [], activeId = null, onselect } = $props();

  const num = (i) => String(i + 1).padStart(2, '0');
  const tag = (b) => (b.kind === 'channel' ? `>ch ${b.count ?? ''}`.trim() : `[${b.kind}]`);
</script>

<ul class="at-navlist">
  {#each blocks as b, i (b.id)}
    <li>
      <button type="button" class:active={b.id === activeId} onclick={() => onselect?.(b)}>
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
