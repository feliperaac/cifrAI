import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// /health do dev server, espelhando o Caddyfile.web usado em prod (healthcheck do compose).
const health = (): Plugin => ({
  name: 'cifrai-health',
  configureServer(server) {
    server.middlewares.use('/health', (_req, res) => {
      res.statusCode = 200;
      res.end('ok');
    });
  },
});

export default defineConfig({
  cacheDir: process.env['VITE_CACHE_DIR'] ?? 'node_modules/.vite',
  plugins: [
    react(),
    tailwindcss(),
    health(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'CifrAI',
        short_name: 'CifrAI',
        description: 'Aprenda violão do zero, em lições curtas.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#a8330f',
        background_color: '#fbf5ea',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
    // Atras do Caddy o Host e "localhost"/dominio do proxy; HMR usa a origem da pagina (wss).
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env['API_PROXY_TARGET'] ?? 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
