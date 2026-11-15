import { defineConfig } from 'vite';

// The page the QR code points to; hosted separately from the TV widget.
export default defineConfig({
  base: './',
  publicDir: false,   // the widget's config.xml and icon are not part of the phone page
  build: { target: 'es2019', outDir: 'dist-phone', emptyOutDir: true, rollupOptions: { input: 'pair.html' } },
});
