<script>
  // The signature draggable box: per-level header (site identity at root, entered
  // channel when drilled), breadcrumb, nav list, connections strip, mobile hamburger.
  import { drag } from '../lib/drag.js';
  import NavList from './NavList.svelte';
  import Breadcrumb from './Breadcrumb.svelte';
  import ConnectionsStrip from './ConnectionsStrip.svelte';

  let { nav, onselect, onnavigate, onjump, onloadmore } = $props();

  // Collapsed by default on mobile; open on desktop.
  let open = $state(typeof window === 'undefined' || !window.matchMedia?.('(max-width: 768px)').matches);
</script>

<div class="at-panel" use:drag>
  <div class="header" data-drag-handle>
    <button class="hamburger" type="button" aria-label="Toggle menu" onclick={() => (open = !open)}>
      <span></span><span></span><span></span>
    </button>
    {#if nav.config.logo && nav.atRoot}
      <img class="logo" src={nav.config.logo} alt="" />
    {/if}
    <span class="title">{nav.title || 'AreNotebook'}</span>
  </div>

  {#if open}
    <div class="body">
      <Breadcrumb crumbs={nav.breadcrumb} {onnavigate} />
      {#if nav.about}<p class="about">{@html nav.about}</p>{/if}
      {#if nav.error}<p class="err">{nav.error}</p>{/if}

      <NavList blocks={nav.blocks} activeId={nav.active?.id} {onselect} />

      {#if nav.hasMore}
        <button class="more" type="button" onclick={onloadmore}>load more…</button>
      {/if}

      <ConnectionsStrip connections={nav.connections} {onjump} />
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
  }
  .title {
    color: var(--an-accent);
  }
  .logo {
    height: 20px;
    width: auto;
  }
  .hamburger {
    display: none;
    flex-direction: column;
    justify-content: space-between;
    width: 22px;
    height: 16px;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
  }
  .hamburger span {
    display: block;
    height: 2px;
    background: var(--an-accent);
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

  @media (max-width: 768px) {
    .header {
      cursor: default;
    }
    .hamburger {
      display: flex;
    }
  }
</style>
