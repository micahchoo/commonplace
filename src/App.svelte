<script>
  // Wave 1 walking skeleton: config → adapter → router → Stage, with a plain nav.
  // The real draggable Panel + full nav (drill/breadcrumb/connections) land in Waves 3–4.
  import { onMount } from 'svelte';
  import { resolveConfig } from './lib/config.js';
  import { arena } from './lib/arena.js';
  import { decodeHash, encodePath, onHash } from './lib/router.js';
  import NavList from './components/NavList.svelte';
  import Stage from './components/Stage.svelte';

  let config = $state(null);
  let blocks = $state([]);
  let active = $state(null);
  let loading = $state(true);
  let error = $state(null);

  // Wave 1 landing: first Image (the only always-paints kind available now).
  // Task 13 broadens to Image→Embed→Attachment→known-framable-Link + index fallback.
  const pickLanding = (list) => list.find((b) => b.kind === 'image') || null;

  const openBlock = (id) => {
    const found = blocks.find((b) => b.id === id);
    if (found) active = found;
  };

  function select(b) {
    if (b.kind === 'channel') return; // drill is Wave 3
    const slug = config?.channels?.[0];
    window.location.hash = encodePath(slug ? [slug] : [], b.id);
  }

  onMount(async () => {
    config = await resolveConfig(window.location.search);
    document.title = config.title || 'AreNotebook';

    const first = config.channels[0];
    if (!first) {
      loading = false;
      return;
    }

    try {
      await arena.getChannelMeta(first);
      const page = await arena.getContentsPage(first, 1);
      blocks = page.blocks;
    } catch (e) {
      error = `Channel unreachable: ${first}`;
    }
    loading = false;

    const { blockId } = decodeHash(window.location.hash);
    active = (blockId != null && blocks.find((b) => b.id === blockId)) || pickLanding(blocks);

    onHash(({ blockId }) => {
      if (blockId != null) openBlock(blockId);
    });
  });
</script>

<Stage block={active} />

<div class="at-panel">
  {#if loading}
    <p>Loading…</p>
  {:else if error}
    <p class="err">{error}</p>
  {:else if !config?.channels?.length}
    <p>Configure me — add a <code>config.json</code> or open with <code>?channel=slug</code>.</p>
  {:else}
    {#if config.title}<h1>{config.title}</h1>{/if}
    <NavList {blocks} activeId={active?.id} onselect={select} />
  {/if}
</div>

<style>
  .at-panel {
    position: fixed;
    left: 10px;
    top: 40%;
    z-index: 10;
    padding: 13px 15px;
    background: var(--an-panel-bg);
    border: solid var(--an-border);
    box-shadow: var(--an-shadow-1) 3px 3px 0, 6px 6px 0 var(--an-shadow-2);
    font: 15px/20px var(--an-font);
    color: var(--an-text);
    max-width: 40ch;
  }
  .at-panel h1 {
    font-size: 15px;
    font-weight: normal;
    margin-bottom: 8px;
    color: var(--an-accent);
  }
  .err {
    color: var(--an-shadow-2);
  }
</style>
