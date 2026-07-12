import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// The svelte plugin lets Vitest compile `.svelte` and `.svelte.js` (runes) files.
// jsdom gives DOMPurify + component code a DOM to run against.
export default defineConfig({
  plugins: [svelte({ compilerOptions: { hmr: false } })],
  // Resolve Svelte's browser/client build so mount() works under jsdom (not the SSR build).
  resolve: {
    conditions: ['browser'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.test.js'],
  },
});
