import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, "../../.env") });

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      title: "News Pipeline",
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      ],
    },
  },
  runtimeConfig: {
    public: {
      displayTz: process.env.DISPLAY_TZ || "UTC",
      displayTzLabel: process.env.DISPLAY_TZ_LABEL ?? "",
    },
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: {
    port: 7670,
  },
  ssr: false,

  // when enabling ssr option you need to disable inlineStyles and maybe devLogs
  features: {
    inlineStyles: false,
    devLogs: false,
  },

  build: {
    transpile: ['vuetify'],
  },

  vite: {
    ssr: {
      noExternal: ['vuetify'],
    },
  },
  
  nitro: {
    esbuild: {
      options: {
        target: 'es2020',
      },
    },
  },

  css: [],
  modules: ['vuetify-nuxt-module', '@vite-pwa/nuxt'],

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'News Pipeline',
      short_name: 'News',
      description: 'Automated news aggregation and briefing reports.',
      theme_color: '#0f172a',
      background_color: '#f5f3ee',
      display: 'standalone',
      icons: [
        {
          src: '/favicon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any',
        },
        {
          src: '/favicon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      navigateFallback: '/',
      runtimeCaching: [
        {
          urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            networkTimeoutSeconds: 5,
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 5 * 60,
            },
          },
        },
      ],
    },
    devOptions: {
      enabled: false,
    },
  },

  vuetify: {
    moduleOptions: {
      // check https://nuxt.vuetifyjs.com/guide/server-side-rendering.html
      ssrClientHints: {
        reloadOnFirstRequest: false,
        viewportSize: false,
        prefersColorScheme: false,

        prefersColorSchemeOptions: {
          useBrowserThemeOnly: false,
        },
      },

      // /* If customizing sass global variables ($utilities, $reset, $color-pack, $body-font-family, etc) */
      // disableVuetifyStyles: true,
      // styles: {
      //   configFile: 'assets/settings.scss',
      // },
    },
  },
})
