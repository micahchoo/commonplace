<script>
  // The app shell: boot the config, wire the surfaces to the Reader's moves, render.
  // It holds no navigation logic — the hash is the single source of truth and the
  // Reader is the only thing that reads or writes it (src/lib/reader.svelte.js).
  // `nav` and `reader` are stable instances — do NOT wrap them in $state
  // (reassigning a reactive class instance severs its class-field reactivity).
  import { onMount } from 'svelte';
  import { resolveConfig } from './lib/config.js';
  import { applyTheme } from './lib/theme.js';
  import { Nav } from './lib/nav.svelte.js';
  import { Reader } from './lib/reader.svelte.js';
  import { arena } from './lib/arena.js';
  import { collectThumbnails } from './lib/covers.js';
  import { isMobile } from './lib/viewport.js';
  import Panel from './components/Panel.svelte';
  import Stage from './components/Stage.svelte';
  import Cover from './components/Cover.svelte';
  import ThumbGrid from './components/ThumbGrid.svelte';
  import EmptyState from './components/EmptyState.svelte';

  const nav = new Nav(); // uses the shared `arena` singleton by default
  const reader = new Reader(nav);
  let booted = $state(false);
  let coverThumbs = $state([]); // root-cover contact sheet

  // Below the breakpoint the menu is a full-width bar rather than a floating box:
  // it starts collapsed there and closes again on a pick.
  let menuOpen = $state(!isMobile());

  function select(b) {
    // A block fills the screen behind the menu; a drill just changes the index, so
    // only the first of the two needs the mobile menu out of the way.
    if (b?.kind !== 'channel' && isMobile()) menuOpen = false;
    reader.select(b);
  }

  /**
   * Key bindings, and nothing else — every branch is one call to a reader move.
   * ←/→ (and k/j) page through the channel, g toggles the contact sheet, Escape
   * backs out. Up/Down stay free so a long text block can still be scrolled.
   */
  function onKeydown(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))
      return;

    switch (e.key) {
      case 'ArrowRight':
      case 'j':
        e.preventDefault();
        reader.step(1);
        break;
      case 'ArrowLeft':
      case 'k':
        e.preventDefault();
        reader.step(-1);
        break;
      case 'g':
        e.preventDefault();
        reader.toggleGrid();
        break;
      case 'Escape':
        reader.escape();
        break;
    }
  }

  // Warm the root cover whenever the configured channels change — at boot, and
  // again when a pasted channel joins them. Reuses arena's page cache, so it also
  // warms channel entry; failures degrade to the typographic cover.
  $effect(() => {
    const channels = nav.config.channels;
    if (!channels.length) return;
    collectThumbnails(arena, channels).then((t) => (coverThumbs = t));
  });

  // Per-view document title: every deep link used to produce the same history entry,
  // the same bookmark and the same tab, whatever it pointed at.
  $effect(() => {
    if (!booted) return;
    const parts = [nav.active?.title, nav.atRoot ? null : nav.title, nav.config.title || 'Commonplace'];
    document.title = [...new Set(parts.filter(Boolean))].join(' — ');
  });

  onMount(async () => {
    nav.config = await resolveConfig(window.location.search);
    applyTheme(nav.config.theme);
    document.title = nav.config.title || 'Commonplace';
    await nav.loadRoot();

    reader.landOnBoot();
    await reader.sync();
    booted = true;

    window.addEventListener('hashchange', () => reader.sync());
  });
</script>

<svelte:window onkeydown={onKeydown} />

<Stage block={nav.active} sourceVisible={!reader.gridMode} />

{#if booted && nav.config.channels.length}
  {#if nav.atRoot && !nav.active}
    <Cover
      title={nav.title}
      about={nav.about}
      thumbs={coverThumbs}
      onpick={(t) => reader.openFromCover(t)}
    />
  {:else if reader.gridMode && reader.gridAvailable}
    <ThumbGrid thumbs={reader.cells} activeId={nav.active?.id} onpick={select} />
  {/if}
{/if}

{#if !booted}
  <div class="at-panel at-skeleton"><p>Loading…</p></div>
{:else if !nav.config.channels.length}
  <EmptyState onopen={(slug) => reader.openChannel(slug)} />
{:else}
  <Panel
    {nav}
    gridMode={reader.gridMode}
    gridAvailable={reader.gridAvailable}
    bind:open={menuOpen}
    ongrid={() => reader.toggleGrid()}
    onselect={select}
    onnavigate={(depth) => reader.goToDepth(depth)}
    onjump={(slug) => reader.goToChannel(slug)}
    onloadmore={() => nav.loadMore()}
    onopen={(slug) => reader.openChannel(slug)}
  />
{/if}
