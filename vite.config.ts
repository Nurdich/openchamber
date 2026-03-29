import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { themeStoragePlugin } from './vite-theme-plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Normalize a module ID to forward slashes for portable pattern matching.
// Required because bun on Windows resolves packages to absolute paths with
// backslashes (e.g. node_modules\.bun\shiki@3.23.0\node_modules\shiki\...).
const norm = (id: string) => id.replace(/\\/g, '/')

// Extract the logical npm package name from a resolved module ID.
// Works with bun's hoisting layout (node_modules/.bun/<pkg@ver>/node_modules/<pkg>)
// as well as the standard flat layout (node_modules/<pkg>).
function packageName(id: string): string | undefined {
  const n = norm(id)
  // Take the last "node_modules/<name>" segment so bun's versioned directories
  // (.bun/shiki@3.23.0/node_modules/shiki) resolve to the actual package name.
  const parts = n.split('/node_modules/')
  const last = parts[parts.length - 1]
  if (!last) return undefined
  const segments = last.split('/')
  return last.startsWith('@') ? `${segments[0]}/${segments[1]}` : segments[0]
}

export default defineConfig({
  plugins: [
    react({
      development: false,
    }),
    themeStoragePlugin(),
  ],
  resolve: {
    alias: [
      { find: '@opencode-ai/sdk/v2', replacement: path.resolve(__dirname, './node_modules/@opencode-ai/sdk/dist/v2/client.js') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  worker: {
    format: 'es',
  },
  define: {
    'process.env': {},
    'process.env.NODE_ENV': JSON.stringify('production'),
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@opencode-ai/sdk/v2'],
  },
  build: {
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      external: ['node:child_process', 'node:fs', 'node:path', 'node:url'],
      output: {
        // Consolidate shiki/codemirror micro-chunks and group other vendor
        // packages. Without explicit rules the generic fallback lumps every
        // bun-hosted package into one "vendor-.bun-xxx" chunk (~17 MB).
        manualChunks(id: string) {
          const n = norm(id)

          // ── Shiki ───────────────────────────────────────────────────────
          if (n.includes('/shiki/dist/langs/') || n.includes('/@shikijs/langs/')) {
            return 'vendor-shiki-langs'
          }
          if (n.includes('/shiki/dist/themes/') || n.includes('/@shikijs/themes/')) {
            return 'vendor-shiki-themes'
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
            return 'vendor-shiki-core'
          }

          // ── CodeMirror ──────────────────────────────────────────────────
          if (n.includes('/@codemirror/') || n.includes('/node_modules/codemirror/')) {
            return 'vendor-codemirror'
          }

          // ── Mermaid ─────────────────────────────────────────────────────
          if (n.includes('/node_modules/mermaid/') || n.includes('/node_modules/beautiful-mermaid/')) {
            return 'vendor-mermaid'
          }

          // ── Pierre diffs ────────────────────────────────────────────────
          if (n.includes('/@pierre/diffs/') || n.includes('@pierre+diffs')) {
            return 'vendor-pierre-diffs'
          }

          // Streamdown merged into shiki-core (it depends on shiki)

          // ── heic2any ────────────────────────────────────────────────────
          if (n.includes('/node_modules/heic2any/')) {
            return 'vendor-heic2any'
          }

          // ── Standard vendor groups ───────────────────────────────────────
          if (!n.includes('node_modules')) return undefined

          const pkg = packageName(id)
          if (!pkg) return undefined

          if (pkg === 'react' || pkg === 'react-dom') return 'vendor-react'
          if (pkg === 'zustand') return 'vendor-zustand'
          if (pkg === '@opencode-ai/sdk') return 'vendor-opencode-sdk'
          if (pkg.includes('remark') || pkg.includes('rehype') || pkg === 'react-markdown') return 'vendor-markdown'
          if (pkg.startsWith('@radix-ui')) return 'vendor-radix'
          if (pkg.includes('react-syntax-highlighter') || pkg.includes('highlight.js')) return 'vendor-syntax'

          const sanitized = pkg.replace(/^@/, '').replace(/\//g, '-')
          return `vendor-${sanitized}`
        },
      },
    },
  },
})
