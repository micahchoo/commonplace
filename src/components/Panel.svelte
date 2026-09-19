<script>
  // The signature draggable box: per-level header (site identity at root, entered
  // channel when drilled), breadcrumb, nav list, connections strip, grid toggle,
  // and the minimize/maximize control.
  import { drag } from '../lib/drag.js';
  import NavList from './NavList.svelte';
  import Breadcrumb from './Breadcrumb.svelte';
  import ConnectionsStrip from './ConnectionsStrip.svelte';
  import ChannelOpener from './ChannelOpener.svelte';

  // `open` is bindable: the shell collapses the menu on mobile when a block is
  // picked, because the expanded panel covers the whole screen there — it hid the
  // very block the tap had just opened.
  let { nav, gridMode = false, gridAvailable = false, open = $bindable(true), ongrid, onselect, onnavigate, onjump, onloadmore, onopen } = $props();

  // Publish the collapsed-bar height as --at-bar-h so the stage can center content in
  // the space *below* the mobile pinned bar instead of the full viewport. Measured
  // only while collapsed (the expanded menu overlays content anyway).
  let panelEl;
  $effect(() => {
    if (!panelEl || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      if (!open) document.documentElement.style.setProperty('--at-bar-h', `${panelEl.getBoundingClientRect().height + 8}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(panelEl);
    return () => ro.disconnect();
  });
</script>

<div class="at-panel" bind:this={panelEl} use:drag>
  <div class="header" data-drag-handle>
    <span class="grip" aria-hidden="true" title="Drag to move"></span>
    {#if nav.config.logo && nav.atRoot}
      <img class="logo" src={nav.config.logo} alt="" />
    {/if}
    <span class="title">{nav.title || 'Commonplace'}</span>
    {#if nav.loading}<span class="busy" role="status" aria-label="Loading">…</span>{/if}
    <span class="hfill"></span>
    {#if gridAvailable}
      <button
        class="viewtoggle"
        class:on={gridMode}
        type="button"
        aria-label="Grid view"
        aria-pressed={gridMode}
        onclick={ongrid}
      >grid</button>
    {/if}
    <button
      class="toggle"
      type="button"
      aria-label={open ? 'Minimize menu' : 'Maximize menu'}
      aria-expanded={open}
      onclick={() => (open = !open)}
    >{open ? '–' : '+'}</button>
  </div>

  {#if open}
    <div class="body">
      <Breadcrumb crumbs={nav.breadcrumb} {onnavigate} />
      {#if nav.about}<p class="about">{@html nav.about}</p>{/if}
      {#if nav.error}<p class="err">{nav.error}</p>{/if}

      <NavList blocks={nav.blocks} activeId={nav.active?.id} {onselect} />

      {#if nav.hasMore}
        <button class="more" type="button" onclick={onloadmore} disabled={nav.loadingMore}>
          {nav.loadingMore ? 'loading…' : 'load more…'}
        </button>
      {/if}

      <ConnectionsStrip connections={nav.connections} {onjump} />

      <ChannelOpener {onopen} />
    </div>
  {/if}
</div>

<style>
  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: move;
    margin-bottom: 6px;
    flex: 0 0 auto; /* pinned; only .body scrolls */
  }
  .title {
    color: var(--an-accent);
  }
  /* `nav.loading` was written and never read: entering a channel over a slow link
     painted no cue at all, and the stale block stayed on the stage. */
  .busy {
    flex: 0 0 auto;
    opacity: 0.7;
    animation: at-blink 1s steps(2, end) infinite;
  }
  @keyframes at-blink {
    50% {
      opacity: 0.15;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .busy {
      animation: none;
    }
  }
  .logo {
    height: 20px;
    width: auto;
  }
  /* Clear drag affordance — a CSS-drawn dot grip, so it renders in any font. */
  .grip {
    flex: 0 0 auto;
    width: 9px;
    height: 15px;
    cursor: move;
    background-image: radial-gradient(currentColor 1px, transparent 1.3px);
    background-size: 4px 4px;
    background-position: center;
    opacity: 0.5;
  }
  .hfill {
    flex: 1 1 auto; /* pushes the view controls to the right edge */
  }
  /* Toggle the current channel between single-block and grid (board) view. */
  .viewtoggle {
    flex: 0 0 auto;
    height: 20px;
    padding: 0 6px;
    background: none;
    border: 1px solid var(--an-border);
    color: var(--an-accent);
    font: inherit;
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
  }
  .viewtoggle.on {
    background: var(--an-accent);
    color: var(--an-panel-bg);
  }
  /* Minimize (–) / maximize (+) the body; always visible, desktop and mobile. */
  .toggle {
    flex: 0 0 auto;
    width: 20px;
    height: 20px;
    padding: 0;
    background: none;
    border: 1px solid var(--an-border);
    color: var(--an-accent);
    font: inherit;
    line-height: 1;
    cursor: pointer;
  }
  .body {
    overflow-y: auto;
    min-height: 0; /* lets the flex child scroll instead of overflowing the box */
  }
  .about {
    font-size: 13px;
    margin-bottom: 8px;
    opacity: 0.85;
  }
  .about :global(p) {
    margin: 0;
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
  .more:disabled {
    cursor: default;
    opacity: 0.6;
    text-decoration: none;
  }

  @media (max-width: 768px) {
    .header {
      cursor: default;
    }
    .grip {
      display: none; /* drag is disabled ≤768px */
    }
  }
</style>
