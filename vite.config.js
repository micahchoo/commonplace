import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base: './' so content-hashed assets resolve under subpath hosting
// (GitHub Pages project pages) and file:// — the app is a static SPA.
export default defineConfig({
  base: './',
  plugins: [svelte()],
});
