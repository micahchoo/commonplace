/**
 * Nav state machine — the drill stack, breadcrumb, connections, active block.
 * MUST be `.svelte.js` (uses runes). Reactive fields are read directly off the
 * instance (class $state fields stay live for consumers).
 *
 * The tree is uniform: the synthetic root's entries are the config section channels
 * (as channel-kind blocks); every channel node's entries are its available blocks +
 * nested Channel drill-nodes, plus a connections strip. One breadcrumb spans it.
 */
import { arena as defaultArena } from './arena.js';
import { isDenylisted } from './denylist.js';
import { sanitizeHtml } from './sanitize.js';
import { DEPTH_CAP } from './router.js';

const sameSlug = (a, b) => a === b;

export class Nav {
  path = $state([]); // [{slug, title, description}] — the drill stack (root is implicit [])
  blocks = $state([]); // current node's entries (sections at root, else NormBlocks)
  active = $state(null); // open NormBlock
  connections = $state([]); // [{slug,title}] sideways jumps
  sections = $state([]); // root entries: channel-kind blocks with {dead}
  connectionMode = $state(false); // true when the current node was reached via a jump
  loading = $state(false);
  error = $state(null);
  hasMore = $state(false);
  config = $state({ channels: [] });

  #arena;
  #page = 1;

  constructor({ arena = defaultArena, config } = {}) {
    this.#arena = arena;
    if (config) this.config = config;
  }

  get atRoot() {
    return this.path.length === 0;
  }

  /** [{slug|null, title}] — first crumb is the synthetic root (config title). */
  get breadcrumb() {
    return [{ slug: null, title: this.config.title || 'Home' }, ...this.path];
  }

  /** Header identity: root → config; inside → the entered channel. */
  get title() {
    return this.atRoot ? this.config.title || '' : this.path[this.path.length - 1].title;
  }
  /**
   * Sanitized: an entered channel's `description` is remote Are.na HTML and
   * `config.about` is deployer HTML — both render through `{@html}` (Panel + Cover),
   * so canonicalize every about-HTML render onto the one sanitized path here rather
   * than trusting each sink to remember (ISSUES I1).
   */
  get about() {
    const raw = this.atRoot ? this.config.about || '' : this.path[this.path.length - 1].description || '';
    return sanitizeHtml(raw);
  }

  /** Resolve the config sections as channel-kind entries; degrade per section. */
  async loadRoot() {
    this.loading = true;
    const slugs = this.config.channels || [];
    const settled = await Promise.allSettled(slugs.map((s) => this.#arena.getChannelMeta(s)));
    this.sections = settled.map((r, i) =>
      r.status === 'fulfilled'
        ? { id: -(i + 1), kind: 'channel', title: r.value.title, channelSlug: slugs[i], count: r.value.counts?.contents ?? null, dead: false }
        : { id: -(i + 1), kind: 'channel', title: slugs[i], channelSlug: slugs[i], count: null, dead: true },
    );
    this.path = [];
    this.blocks = this.sections;
    this.connections = [];
    this.connectionMode = false;
    this.active = null;
    this.loading = false;
  }

  async #loadChannel(slug, title) {
    this.loading = true;
    this.#page = 1;
    try {
      const meta = await this.#arena.getChannelMeta(slug);
      const page = await this.#arena.getContentsPage(slug, 1);
      this.blocks = page.blocks;
      this.hasMore = page.hasMore;
      this.error = null;
      this.loading = false;
      return { slug, title: title || meta.title, description: meta.description };
    } catch (e) {
      this.error = e?.rateLimited
        ? 'Rate limited — please slow down a moment.'
        : `Channel unreachable: ${slug}`;
      this.blocks = [];
      this.hasMore = false;
      this.loading = false;
      return { slug, title: title || slug, description: '' };
    }
  }

  async #loadConnections(slug) {
    try {
      const { channels } = await this.#arena.getConnections(slug);
      const onPath = new Set(this.path.map((n) => n.slug));
      this.connections = channels.filter((c) => !onPath.has(c.slug)); // no cyclic affordance
    } catch {
      this.connections = [];
    }
  }

  /** Drill into a child channel. Cycle-guarded + depth-capped. */
  async enter(slug, title) {
    if (this.path.some((n) => sameSlug(n.slug, slug))) return; // cycle guard
    if (this.path.length >= DEPTH_CAP) return; // depth cap
    const node = await this.#loadChannel(slug, title);
    this.path = [...this.path, node];
    this.active = null;
    this.connectionMode = false;
    await this.#loadConnections(slug);
  }

  /** Pop the breadcrumb to `toDepth` path nodes kept (0 = root). */
  async pop(toDepth) {
    if (toDepth <= 0) return this.loadRoot();
    const target = this.path[toDepth - 1];
    this.path = this.path.slice(0, toDepth);
    await this.#loadChannel(target.slug, target.title);
    this.active = null;
    await this.#loadConnections(target.slug);
  }

  /** Sideways jump: a FRESH breadcrumb rooted at the target (sideways ≠ child). */
  async jump(slug, title) {
    const node = await this.#loadChannel(slug, title);
    this.path = [node];
    this.active = null;
    this.connectionMode = true;
    await this.#loadConnections(slug);
  }

  /** Lazy pagination — page 1 is free; more on demand. */
  async loadMore() {
    if (!this.hasMore || this.atRoot) return;
    const slug = this.path[this.path.length - 1].slug;
    this.#page += 1;
    const page = await this.#arena.getContentsPage(slug, this.#page);
    this.blocks = [...this.blocks, ...page.blocks];
    this.hasMore = page.hasMore;
  }

  openBlock(id) {
    const found = this.blocks.find((b) => b.id === id);
    if (found && found.kind !== 'channel') this.active = found;
    return found;
  }

  /**
   * Land on the first block that will actually paint, preferring
   * Image → Embed(non-empty) → Attachment → known-framable Link. If nothing paints
   * (empty, drill-only, or only denylisted links), show the index — never a card.
   */
  landing() {
    const paints = (b) => {
      switch (b.kind) {
        case 'image':
        case 'attachment':
          return true;
        case 'embed':
          return Boolean(b.embedHtml);
        case 'link':
          return !isDenylisted(b.link?.url);
        default:
          return false;
      }
    };
    for (const kind of ['image', 'embed', 'attachment', 'link']) {
      const c = this.blocks.find((b) => b.kind === kind && paints(b));
      if (c) {
        this.active = c;
        return c;
      }
    }
    this.active = null; // section index, calm empty stage
    return null;
  }
}
