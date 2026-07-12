<script>
  // The app shell. Hash is the single source of truth: user actions set the hash,
  // hashchange drives nav. Initial empty hash auto-enters the first section (Binder's
  // "load the first one"); popping to root later shows the sections list.
  // `nav` is a stable instance — do NOT wrap it in $state (reassigning a reactive
  // class instance severs its class-field reactivity). The draggable Panel replaces
  // this .at-panel container in Wave 4 (Task 19).
  import { onMount } from 'svelte';
  import { resolveConfig } from './lib/config.js';
  import { Nav } from './lib/nav.svelte.js';
  import { decodeHash, encodePath, navigate } from './lib/router.js';
  import NavList from './components/NavList.svelte';
  import Breadcrumb from './components/Breadcrumb.svelte';
  import ConnectionsStrip from './components/ConnectionsStrip.svelte';
  import Stage from './components/Stage.svelte';

  const nav = new Nav();
  let booted = $state(false);

  const pathSlugs = () => nav.path.map((n) => n.slug);
  const sameArr = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  function select(b) {
    if (b.kind === 'channel') navigate([...pathSlugs(), b.channelSlug]);
    else navigate(pathSlugs(), b.id);
  }

  // The single place nav mutates from the URL: reconcile nav to the hash
  // (handles initial load, drill/pop/jump, back/forward, and deep links).
  async function sync() {
    const { slugs, blockId } = decodeHash(window.location.hash);
    if (!sameArr(pathSlugs(), slugs)) {
      await nav.loadRoot();
      for (const s of slugs) await nav.enter(s);
    }
    if (blockId != null) nav.openBlock(blockId);
    else if (!nav.atRoot) nav.landing();
    else nav.active = null;
  }

  onMount(async () => {
    nav.config = await resolveConfig(window.location.search);
    document.title = nav.config.title || 'AreNotebook';
    await nav.loadRoot();

    // Initial empty hash → auto-enter the first section (Binder's "load the first
    // one"), reflected in the URL so state and hash never disagree. replaceState
    // avoids a spurious history entry / hashchange loop.
    const { slugs } = decodeHash(window.location.hash);
    if (!slugs.length && nav.sections[0] && !nav.sections[0].dead) {
      history.replaceState(null, '', encodePath([nav.sections[0].channelSlug]));
    }
    await sync();
    booted = true;

    window.addEventListener('hashchange', sync);
  });
</script>

<Stage block={nav.active} />

<div class="at-panel">
  {#if !booted}
    <p>Loading…</p>
  {:else if !nav.config.channels.length}
    <p>Configure me — add a <code>config.json</code> or open with <code>?channel=slug</code>.</p>
  {:else}
    <Breadcrumb crumbs={nav.breadcrumb} onnavigate={(depth) => navigate(pathSlugs().slice(0, depth))} />
    {#if nav.about}<p class="about">{nav.about}</p>{/if}
    {#if nav.error}<p class="err">{nav.error}</p>{/if}

    <NavList blocks={nav.blocks} activeId={nav.active?.id} onselect={select} />

    {#if nav.hasMore}
      <button class="more" type="button" onclick={() => nav.loadMore()}>load more…</button>
    {/if}

    <ConnectionsStrip connections={nav.connections} onjump={(slug) => navigate([slug])} />
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
    max-width: 42ch;
  }
  .about {
    font-size: 13px;
    margin-bottom: 8px;
    opacity: 0.85;
  }
  .err {
    color: var(--an-shadow-2);
    font-size: 13px;
  }
  .more {
    margin-top: 6px;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--an-text);
    font: inherit;
    text-decoration: underline;
  }
  .more:hover {
    color: var(--an-accent);
  }
</style>
