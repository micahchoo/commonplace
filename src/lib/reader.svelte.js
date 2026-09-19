/**
 * The Reader — where the URL and the Nav tree meet.
 *
 * `Nav` owns the drill tree and knows nothing about the hash; `router.js` encodes
 * and decodes the hash and knows nothing about the tree. Everything that joins
 * them — reconciling nav to a decoded hash, and turning a reader's move into the
 * hash that expresses it — used to live in the app shell, which is the one module
 * with no interface to test through: asserting "the right arrow opens the next
 * block" meant booting the whole app into jsdom, faking `fetch`, dispatching a
 * KeyboardEvent and waiting on a CSS class. That is testing past the interface.
 *
 * So the moves live here instead. Each method is one thing a reader can do; all of
 * them end in a hash write, and `sync()` is the only thing that reads the hash
 * back. A caller needs the six moves and the three reads below — nothing about
 * pagination, cycle guards, encoding, or the supersede token.
 *
 * MUST be `.svelte.js`: `gridMode` is a rune.
 */
import { decodeHash, encodePath, navigate } from './router.js';
import { toCell } from './covers.js';

const sameArr = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

export class Reader {
  gridMode = $state(false); // the in-channel contact sheet is showing

  #nav;
  #token = 0; // supersedes an in-flight sync

  /** @param {import('./nav.svelte.js').Nav} nav */
  constructor(nav) {
    this.#nav = nav;
  }

  /** The drill path as slugs — what the hash encodes. */
  get #pathSlugs() {
    return this.#nav.path.map((n) => n.slug);
  }

  /**
   * Every loaded entry of the current channel as a contact-sheet cell: a thumbnail
   * where the block carries an image, a typographic tile otherwise. Filtering to
   * image blocks made the sheet a partial index — text and thumb-less links just
   * vanished from it.
   */
  get cells() {
    if (this.#nav.atRoot) return [];
    const slug = this.#pathSlugs.at(-1) || '';
    return (this.#nav.blocks || []).map((b) => toCell(b, slug));
  }

  get gridAvailable() {
    return !this.#nav.atRoot && this.cells.length > 0;
  }

  /** The current channel's stage-openable entries, in index order. */
  get #openable() {
    return (this.#nav.blocks || []).filter((b) => b.kind !== 'channel');
  }

  // --- moves -------------------------------------------------------------

  /** Open a block, or drill into a channel entry. Accepts a NormBlock or a cell. */
  select(b) {
    if (!b) return;
    if (b.kind === 'channel') return this.#goDeeper(b.channelSlug);
    this.gridMode = false; // picking a specific block drops into its single view
    navigate(this.#pathSlugs, b.id);
  }

  /**
   * Move `delta` entries along the current channel. Drill nodes are skipped — they
   * are not stage content — and stepping off the end of the loaded window pulls the
   * next page, so a long channel reads straight through.
   */
  async step(delta) {
    if (this.#nav.atRoot) return;
    let list = this.#openable;
    if (!list.length) return;
    const here = list.findIndex((b) => b.id === this.#nav.active?.id);
    const want = here < 0 ? (delta > 0 ? 0 : list.length - 1) : here + delta;
    if (want < 0) return;
    if (want >= list.length) {
      if (!this.#nav.hasMore) return;
      await this.#nav.loadMore();
      list = this.#openable;
      if (want >= list.length) return;
    }
    this.gridMode = false;
    navigate(this.#pathSlugs, list[want].id);
  }

  /**
   * Open a cell picked off the root cover. Unlike `select`, the cell names the
   * channel it belongs to — the cover is cross-channel and shows at the root, so
   * there is no current path to open it against.
   */
  openFromCover(cell) {
    if (cell?.slug) navigate([cell.slug], cell.id);
  }

  /** Drill one level in, from the current channel. */
  #goDeeper(slug) {
    if (slug) navigate([...this.#pathSlugs, slug]);
  }

  /** Pop the breadcrumb to `depth` path nodes kept; 0 is the site root. */
  goToDepth(depth) {
    navigate(this.#pathSlugs.slice(0, depth));
  }

  /** Reroot on a channel — a connections-strip jump, or a root section. */
  goToChannel(slug) {
    if (slug) navigate([slug]);
  }

  /** Back out one level. At the root there is nowhere to go. */
  #up() {
    if (!this.#nav.atRoot) this.goToDepth(this.#pathSlugs.length - 1);
  }

  toggleGrid() {
    if (this.gridAvailable) this.gridMode = !this.gridMode;
  }

  /** Escape: leave the sheet if it is up, otherwise back out a level. */
  escape() {
    if (this.gridMode) this.gridMode = false;
    else this.#up();
  }

  /**
   * Add a pasted channel as a session section — so it also shows at the root — and
   * go there. The shell warms its cover thumbnails by watching `config.channels`.
   */
  openChannel(slug) {
    if (!slug) return;
    if (!this.#nav.config.channels.includes(slug)) {
      this.#nav.config = { ...this.#nav.config, channels: [...this.#nav.config.channels, slug] };
    }
    this.goToChannel(slug);
  }

  // --- the one reader of the hash ----------------------------------------

  /**
   * The initial landing, before any move. An empty hash with exactly one live
   * section auto-enters it — there is no point covering a site of one item — while
   * several sections stay at the root so the cover reads as a section index. A
   * deep-link hash is always honoured. `replaceState`, not a navigation, so the URL
   * agrees with the state without a history entry nobody asked for. (ISSUES I6)
   */
  landOnBoot() {
    const { slugs } = decodeHash(window.location.hash);
    if (slugs.length || this.#nav.sections.length !== 1) return;
    const only = this.#nav.sections[0];
    if (!only.dead) history.replaceState(null, '', encodePath([only.channelSlug]));
  }

  /**
   * Reconcile nav to the current hash. Tokened: a superseded sync — a held arrow
   * key, fast clicks — must not land its open block over a newer one, and stops
   * entering channels as soon as it is superseded.
   *
   * The guarantee is about the open block. A channel already entered by a
   * superseded sync stays entered: `Nav` has no cancellable load, so the last
   * write to `path` wins. Widening that would mean making the loads abortable.
   */
  async sync() {
    const mine = ++this.#token;
    const live = () => mine === this.#token;
    const { slugs, blockId } = decodeHash(window.location.hash);
    if (!sameArr(this.#pathSlugs, slugs)) {
      this.gridMode = false; // the sheet is per-channel — don't carry it across a drill
      await this.#nav.loadRoot();
      for (const s of slugs) {
        if (!live()) return;
        await this.#nav.enter(s);
      }
      if (!live()) return;
    }
    if (blockId != null) {
      const opened = await this.#nav.openBlockDeep(blockId);
      if (!live()) return;
      if (!opened) this.#nav.landing(); // unknown or unrenderable id → never a blank stage
    } else if (!this.#nav.atRoot) this.#nav.landing();
    else this.#nav.active = null;
  }
}
