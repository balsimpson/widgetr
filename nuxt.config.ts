export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2026-08-28',
  devtools: {
    enabled: false
  },
  typescript: {
    strict: true
  }
})
