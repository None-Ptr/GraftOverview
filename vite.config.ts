import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [tailwindcss(), svelte()],
  resolve: {
    // Order matters: the more specific $lib/components prefix must come first.
    alias: {
      '$lib/components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '$lib/content': fileURLToPath(new URL('./src/content', import.meta.url)),
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    clearMocks: true,
  },
});
