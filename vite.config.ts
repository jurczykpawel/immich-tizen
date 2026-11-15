import { defineConfig, type Plugin } from 'vitest/config';
import preact from '@preact/preset-vite';

// Tizen loads the widget from file://, where Chromium refuses module scripts.
const classicScript = (): Plugin => ({
  name: 'classic-script',
  enforce: 'post',
  transformIndexHtml(html) {
    const m = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
    if (!m) return html;
    return html.replace(m[0], '').replace(' crossorigin href', ' href').replace('</body>', `<script src="${m[1]}"></script></body>`);
  },
});

export default defineConfig({
  base: './',
  plugins: [preact(), classicScript()],
  build: {
    target: 'chrome76',
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: { output: { format: 'iife' } },
  },
  // Desktop preview only: `DEV_IMMICH_TARGET=http://host:2283 pnpm dev` forwards /api so the browser needs no CORS.
  server: process.env.DEV_IMMICH_TARGET ? { host: true, allowedHosts: true, proxy: { '/api': { target: process.env.DEV_IMMICH_TARGET, changeOrigin: true } } } : undefined,
  test: { environment: 'jsdom', include: ['test/**/*.test.{ts,tsx}'] },
});
