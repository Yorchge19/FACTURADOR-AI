import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Load all env vars (including non-VITE_ prefixed ones like API_KEY)
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'icons/*.svg'],
        manifest: {
          name: 'Facturador AI',
          short_name: 'Facturador AI',
          description: 'Facturador AI: la solución inteligente para facturación, inventario y reportes empresariales en un solo lugar.',
          theme_color: '#0a0a0a',
          background_color: '#0a0a0a',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          navigateFallback: 'index.html',
          // No navigateFallbackDenylist needed for HashRouter, but keep SPA fallback
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'cdn-tailwind',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'google-fonts-stylesheets' }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                cacheableResponse: { statuses: [0, 200] },
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            },
            // Firebase / Firestore / Gemini / Hacienda -> NEVER cache stale billing data
            {
              urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly'
            },
            {
              urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*/i,
              handler: 'NetworkOnly'
            },
            {
              urlPattern: /^https:\/\/.*\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly'
            },
            {
              urlPattern: /^https:\/\/api\.hacienda\.go\.cr\/.*/i,
              handler: 'NetworkOnly'
            },
            {
              urlPattern: /^https:\/\/generativelanguage\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly'
            }
          ]
        }
      })
    ],
    define: {
      // Expose API_KEY for GeminiService (non-VITE_ prefix requires explicit mapping)
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
    },
    server: {
      headers: {
        // Prevent clickjacking
        'X-Frame-Options': 'DENY',
        // Prevent MIME-type sniffing
        'X-Content-Type-Options': 'nosniff',
        // Control referrer information sent to external sites
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        // Permissions policy — restrict access to sensitive browser APIs
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        // CSP — updated for PWA (worker + manifest) without relaxing existing rules
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://api.hacienda.go.cr https://generativelanguage.googleapis.com wss://*.firebaseio.com",
          "img-src 'self' data: blob:",
          "worker-src 'self' blob:",
          "manifest-src 'self' blob:",
          "frame-ancestors 'none'",
        ].join('; '),
      },
    },
  };
});
