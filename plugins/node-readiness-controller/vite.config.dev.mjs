/**
 * Non-minified plugin bundle for debugging (readable symbol names + source map).
 * Output: dist/main.dev.js (and main.dev.js.map)
 *
 * Usage: npm run build:dev
 * For Headlamp, copy or symlink main.dev.js as main.js in the plugin folder if needed.
 */
import base from '@kinvolk/headlamp-plugin/config/vite.config.mjs';
import { defineConfig, mergeConfig } from 'vite';

export default mergeConfig(
  base,
  defineConfig({
    build: {
      minify: false,
      sourcemap: true,
      rollupOptions: {
        output: {
          entryFileNames: 'main.dev.js',
        },
      },
    },
  })
);
