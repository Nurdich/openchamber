import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { VitePWA } from 'vite-plugin-pwa';
import { themeStoragePlugin } from '../../vite-theme-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
const pwaDevEnabled = process.env.OPENCHAMBER_DISABLE_PWA_DEV !== '1';
const reactScanToggle = (process.env.VITE_ENABLE_REACT_SCAN ?? '').toLowerCase();
const enableReactScan = reactScanToggle === '1' || reactScanToggle === 'true' || reactScanToggle === 'on' || reactScanToggle === 'yes';

// Normalize a module ID to forward slashes for portable pattern matching.
// Required because bun on Windows resolves packages to absolute paths with
// backslashes under node_modules/.bun/<pkg@ver>/node_modules/<pkg>/...
const norm = (id: string) => id.replace(/\\/g, '/');

// Extract the logical npm package name from a resolved module ID.
// Takes the last "node_modules/<name>" segment so bun's versioned directories
// (.bun/shiki@3.23.0/node_modules/shiki) resolve to the actual package name
// rather than ".bun".
function resolvePackageName(id: string): string | undefined {
  const n = norm(id);
  const parts = n.split('/node_modules/');
  const last = parts[parts.length - 1];
  if (!last) return undefined;
  const segments = last.split('/');
  return last.startsWith('@') ? `${segments[0]}/${segments[1]}` : segments[0];
}

export default defineConfig({
  root: path.resolve(__dirname, '.'),
  plugins: [
    react({
      // development: false ensures the Babel/OXC JSX transform emits
      // jsx()/jsxs() (production runtime) instead of jsxDEV() (dev runtime).
      // Vite 7's OXC path does not propagate this flag automatically when
      // NODE_ENV is only set via `define`, so it must be explicit here too.
      development: false,
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    {
      name: 'inject-react-scan-script',
      transformIndexHtml() {
        if (!enableReactScan) {
          return;
        }
        return [
          {
            tag: 'script',
            attrs: {
              crossorigin: 'anonymous',
              src: '//unpkg.com/react-scan/dist/auto.global.js',
            },
            injectTo: 'head-prepend',
          },
        ];
      },
    },
    themeStoragePlugin(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,otf,eot}'],
        // iOS Safari/PWA is much more reliable with a classic (non-module) SW bundle.
        rollupFormat: 'iife',
        // We already keep a custom manifest in index.html
        injectionPoint: undefined,
      },
      devOptions: {
        enabled: pwaDevEnabled,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: [
      { find: '@opencode-ai/sdk/v2', replacement: path.resolve(__dirname, '../../node_modules/@opencode-ai/sdk/dist/v2/client.js') },
      { find: '@openchamber/ui', replacement: path.resolve(__dirname, '../ui/src') },
      { find: '@web', replacement: path.resolve(__dirname, './src') },
      { find: '@', replacement: path.resolve(__dirname, '../ui/src') },
    ],
  },
  worker: {
    format: 'es',
  },
  define: {
    'process.env': {},
    'process.env.NODE_ENV': JSON.stringify('production'),
    global: 'globalThis',
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  optimizeDeps: {
    include: ['@opencode-ai/sdk/v2'],
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: `http://127.0.0.1:${process.env.OPENCHAMBER_PORT || 3001}`,
        changeOrigin: true,
      },
      '/health': {
        target: `http://127.0.0.1:${process.env.OPENCHAMBER_PORT || 3001}`,
        changeOrigin: true,
      },
      '/api': {
        target: `http://127.0.0.1:${process.env.OPENCHAMBER_PORT || 3001}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      external: ['node:child_process', 'node:fs', 'node:path', 'node:url'],
      output: {
        // Consolidate shiki/codemirror micro-chunks and group other vendor
        // packages. The old logic used id.split('node_modules/')[1] which
        // breaks on bun's versioned layout (.bun/shiki@3.23.0/node_modules/…)
        // and collapsed everything into a single "vendor-.bun-xxx" chunk.
        manualChunks(id: string) {
          const n = norm(id);

          // ── Shiki ───────────────────────────────────────────────────────
          // ~300 language grammar files + ~50 theme files emitted as individual
          // chunks. Merge them into 3 named groups.
          if (n.includes('/shiki/dist/langs/') || n.includes('/@shikijs/langs/')) {
            return 'vendor-shiki-langs';
          }
          if (n.includes('/shiki/dist/themes/') || n.includes('/@shikijs/themes/')) {
            return 'vendor-shiki-themes';
          }
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
            return 'vendor-shiki-core';
          }

          // ── CodeMirror ──────────────────────────────────────────────────
          if (n.includes('/@codemirror/') || n.includes('/node_modules/codemirror/')) {
            return 'vendor-codemirror';
          }

          // ── Mermaid ─────────────────────────────────────────────────────
          if (n.includes('/node_modules/mermaid/') || n.includes('/node_modules/beautiful-mermaid/')) {
            return 'vendor-mermaid';
          }

          // ── Pierre diffs ────────────────────────────────────────────────
          if (n.includes('/@pierre/diffs/') || n.includes('@pierre+diffs')) {
            return 'vendor-pierre-diffs';
          }

          // Streamdown merged into shiki-core (it depends on shiki)

          // ── heic2any ────────────────────────────────────────────────────
          if (n.includes('/node_modules/heic2any/')) {
            return 'vendor-heic2any';
          }

          // ── Standard vendor groups ───────────────────────────────────────
          if (!n.includes('node_modules')) return undefined;

          const pkg = resolvePackageName(id);
          if (!pkg) return undefined;

          if (pkg === 'react' || pkg === 'react-dom') return 'vendor-react';
          if (pkg === 'zustand') return 'vendor-zustand';
          if (pkg === '@opencode-ai/sdk') return 'vendor-opencode-sdk';
          if (pkg.includes('remark') || pkg.includes('rehype') || pkg === 'react-markdown') return 'vendor-markdown';
          if (pkg.startsWith('@radix-ui')) return 'vendor-radix';
          if (pkg.includes('react-syntax-highlighter') || pkg.includes('highlight.js')) return 'vendor-syntax';

          const sanitized = pkg.replace(/^@/, '').replace(/\//g, '-');
          return `vendor-${sanitized}`;
        },
      },
    },
  },
});
