<script>
  // The app shell. Hash is the single source of truth: user actions set the hash,
  // hashchange drives nav. `nav` is a stable instance — do NOT wrap it in $state
  // (reassigning a reactive class instance severs its class-field reactivity).
  import { onMount } from 'svelte';
  import { resolveConfig } from './lib/config.js';
  import { applyTheme } from './lib/theme.js';
  import { Nav } from './lib/nav.svelte.js';
  import { decodeHash, encodePath, navigate } from './lib/router.js';
  import Panel from './components/Panel.svelte';
  import Stage from './components/Stage.svelte';
  import EmptyState from './components/EmptyState.svelte';

  const nav = new Nav();
  let booted = $state(false);

  const pathSlugs = () => nav.path.map((n) => n.slug);
  const sameArr = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  function select(b) {
    if (b.kind === 'channel') navigate([...pathSlugs(), b.channelSlug]);
    else navigate(pathSlugs(), b.id);
  }

  // The sole place nav mutates from the URL: reconcile nav to the hash.
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
    applyTheme(nav.config.theme);
    document.title = nav.config.title || 'AreNotebook';
    await nav.loadRoot();

    // Initial empty hash → auto-enter the first section (Binder's "load the first
    // one"), reflected in the URL so state and hash never disagree.
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

{#if !booted}
  <div class="at-panel at-skeleton"><p>Loading…</p></div>
{:else if !nav.config.channels.length}
  <EmptyState />
{:else}
  <Panel
    {nav}
    onselect={select}
    onnavigate={(depth) => navigate(pathSlugs().slice(0, depth))}
    onjump={(slug) => navigate([slug])}
    onloadmore={() => nav.loadMore()}
  />
{/if}
