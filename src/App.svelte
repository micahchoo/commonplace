<script>
  // The app shell. Hash is the single source of truth: user actions set the hash,
  // hashchange drives nav. `nav` is a stable instance — do NOT wrap it in $state
  // (reassigning a reactive class instance severs its class-field reactivity).
  import { onMount } from 'svelte';
  import { resolveConfig } from './lib/config.js';
  import { applyTheme } from './lib/theme.js';
  import { Nav } from './lib/nav.svelte.js';
  import { arena } from './lib/arena.js';
  import { collectThumbnails } from './lib/covers.js';
  import { decodeHash, encodePath, navigate } from './lib/router.js';
  import Panel from './components/Panel.svelte';
  import Stage from './components/Stage.svelte';
  import Cover from './components/Cover.svelte';
  import ThumbGrid from './components/ThumbGrid.svelte';
  import EmptyState from './components/EmptyState.svelte';

  const nav = new Nav(); // uses the shared `arena` singleton by default
  let booted = $state(false);
  let coverThumbs = $state([]); // root-cover contact sheet
  let gridMode = $state(false); // in-channel grid (board) view toggle

  const pathSlugs = () => nav.path.map((n) => n.slug);
  const sameArr = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  // The loaded blocks of the current channel that carry an image, as grid thumbs.
  const channelThumbs = $derived(
    nav.atRoot
      ? []
      : (nav.blocks || [])
          .filter((b) => b.image?.thumb || b.image?.src)
          .map((b) => ({
            id: b.id,
            slug: pathSlugs().at(-1) || '',
            thumb: b.image.thumb || b.image.src,
            title: b.title,
          })),
  );
  const gridAvailable = $derived(!nav.atRoot && channelThumbs.length > 0);

  function select(b) {
    if (b.kind === 'channel') navigate([...pathSlugs(), b.channelSlug]);
    else {
      gridMode = false; // picking a specific block drops into its single view
      navigate(pathSlugs(), b.id);
    }
  }

  // The sole place nav mutates from the URL: reconcile nav to the hash.
  async function sync() {
    const { slugs, blockId } = decodeHash(window.location.hash);
    if (!sameArr(pathSlugs(), slugs)) {
      gridMode = false; // board view is per-channel — don't persist it across a drill/jump
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
    document.title = nav.config.title || 'Commonplace';
    await nav.loadRoot();

    // Warm a thumbnail contact sheet for the root cover. Reuses arena's page cache,
    // so it also warms channel entry; failures degrade to the typographic cover.
    collectThumbnails(arena, nav.config.channels).then((t) => (coverThumbs = t));

    // Initial empty hash: a single section auto-enters (no point covering one item);
    // with several, stay at root so the home Cover shows as a section index. Deep-link
    // hashes are always honored. Reflected in the URL so state and hash agree. (ISSUES I6)
    const { slugs } = decodeHash(window.location.hash);
    if (!slugs.length && nav.sections.length === 1 && !nav.sections[0].dead) {
      history.replaceState(null, '', encodePath([nav.sections[0].channelSlug]));
    }
    await sync();
    booted = true;

    window.addEventListener('hashchange', sync);
  });
</script>

<Stage block={nav.active} />

{#if booted && nav.config.channels.length}
  {#if nav.atRoot && !nav.active}
    <Cover
      title={nav.title}
      about={nav.about}
      thumbs={coverThumbs}
      onpick={(t) => navigate([t.slug], t.id)}
    />
  {:else if gridMode && gridAvailable}
    <ThumbGrid
      thumbs={channelThumbs}
      onpick={(t) => {
        gridMode = false;
        navigate(pathSlugs(), t.id);
      }}
    />
  {/if}
{/if}

{#if !booted}
  <div class="at-panel at-skeleton"><p>Loading…</p></div>
{:else if !nav.config.channels.length}
  <EmptyState />
{:else}
  <Panel
    {nav}
    {gridMode}
    {gridAvailable}
    ongrid={() => (gridMode = !gridMode)}
    onselect={select}
    onnavigate={(depth) => navigate(pathSlugs().slice(0, depth))}
    onjump={(slug) => navigate([slug])}
    onloadmore={() => nav.loadMore()}
  />
{/if}
