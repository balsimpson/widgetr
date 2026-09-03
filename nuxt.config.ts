export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2026-08-28',
  app: {
    head: {
      htmlAttrs: {
        lang: 'en'
      },
      link: [
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/widgetr-favicon.svg'
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '32x32',
          href: '/favicon.png'
        },
        {
          rel: 'shortcut icon',
          type: 'image/png',
          href: '/favicon.png'
        }
      ],
      meta: [
        {
          name: 'application-name',
          content: 'Widgetr'
        },
        {
          name: 'apple-mobile-web-app-title',
          content: 'Widgetr'
        },
        {
          name: 'theme-color',
          content: '#f7f5f0'
        }
      ]
    }
  },
  devtools: {
    enabled: false
  },
  typescript: {
    strict: true
  }
})
