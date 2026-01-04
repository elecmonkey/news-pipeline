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
    },
  },
  runtimeConfig: {
    public: {
      displayTz: process.env.DISPLAY_TZ || "UTC",
      displayTzLabel: process.env.DISPLAY_TZ_LABEL || "UTC",
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

  css: [],
  modules: ['vuetify-nuxt-module'],

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
