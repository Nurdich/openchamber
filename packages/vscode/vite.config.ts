import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Normalize a module ID to forward slashes for cross-platform pattern matching.
const norm = (id: string) => id.replace(/\\/g, '/');

export default defineConfig({
  mode: 'production',
  root: path.resolve(__dirname, 'webview'),
  base: './',
  plugins: [
    react({
      jsxRuntime: 'automatic',
      development: false,
      babel: {
        plugins: [],
        configFile: false,
        babelrc: false,
      },
    }),
  ],
  resolve: {
    alias: [
      { find: '@opencode-ai/sdk/v2', replacement: path.resolve(__dirname, '../../node_modules/@opencode-ai/sdk/dist/v2/client.js') },
      { find: '@openchamber/ui', replacement: path.resolve(__dirname, '../ui/src') },
      { find: '@vscode', replacement: path.resolve(__dirname, './webview') },
      { find: '@', replacement: path.resolve(__dirname, '../ui/src') },
    ],
  },
  worker: {
    format: 'es',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'import.meta.env.DEV': 'false',
    'import.meta.env.PROD': 'true',
    'global': 'globalThis',
    '__OPENCHAMBER_WEBVIEW_BUILD_TIME__': JSON.stringify(new Date().toISOString()),
  },
  envPrefix: ['VITE_'],
  optimizeDeps: {
    include: ['@opencode-ai/sdk/v2'],
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/webview'),
    emptyOutDir: true,
    // Raise the warning threshold — shiki-langs and mermaid are legitimately
    // large vendor bundles and the size warning is noise here.
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      input: path.resolve(__dirname, 'webview/index.html'),
      external: ['node:child_process', 'node:fs', 'node:path', 'node:url'],
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        // Consolidate the ~400 vendor micro-chunks that Rollup would otherwise
        // emit independently (one per dynamic import inside shiki and codemirror).
        //
        // Background: shiki exposes every language grammar and theme as a
        // separate ES module for tree-shaking. Rolldown emits one chunk per
        // dynamic import, producing 400+ output files and the vsce bundle
        // warning. Grouping them here reduces the output to ~10 named chunks.
        //
        // The `id` here is the resolved absolute file path, normalised to
        // forward slashes. On Windows, bun stores packages under
        // node_modules/.bun/<pkg@ver>/node_modules/<pkg>/…
        manualChunks(id: string) {
          const n = norm(id);

          // Shiki language grammars (~300 individual .mjs files)
          if (n.includes('/shiki/dist/langs/') || n.includes('/@shikijs/langs/')) {
            return 'shiki-langs';
          }

          // Shiki built-in themes (~50 theme files)
          if (n.includes('/shiki/dist/themes/') || n.includes('/@shikijs/themes/')) {
            return 'shiki-themes';
          }

          // Shiki core runtime: engine, oniguruma wasm loader, textmate, core
          // Streamdown is merged here since it depends on shiki
          if (
            n.includes('/node_modules/shiki/') ||
            n.includes('/@shikijs/core/') ||
            n.includes('/@shikijs/engine') ||
            n.includes('/@shikijs/vscode-textmate/') ||
            n.includes('/@shikijs/transformers/') ||
            n.includes('/@shikijs/types/') ||
            n.includes('/node_modules/streamdown/') ||
            n.includes('/@streamdown/')
          ) {
            return 'shiki-core';
          }

          // CodeMirror — @codemirror/legacy-modes splits each language into its
          // own module. Consolidate all codemirror packages into one chunk.
          if (n.includes('/@codemirror/') || n.includes('/node_modules/codemirror/')) {
            return 'codemirror';
          }

          // Mermaid diagram renderer (large; keep as a separate lazy chunk)
          if (n.includes('/node_modules/mermaid/') || n.includes('/node_modules/beautiful-mermaid/')) {
            return 'mermaid';
          }

          // Pierre diff viewer (uses shiki via registerCustomTheme)
          if (n.includes('/@pierre/diffs/') || n.includes('@pierre+diffs')) {
            return 'pierre-diffs';
          }

          // Streamdown merged into shiki-core (it depends on shiki)

          // heic2any image converter (large; keep isolated from main bundle)
          if (n.includes('/node_modules/heic2any/')) {
            return 'heic2any';
          }
        },
      },
    },
  },
});
