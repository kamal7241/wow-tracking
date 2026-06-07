// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-05-24',
  srcDir: '.',
  ssr: false,
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: ['@pinia/nuxt'],
  nitro: {
    publicAssets: [
      { dir: '../data', baseURL: '/_data', maxAge: 0 }
    ],
    serverAssets: [
      { baseName: 'data', dir: '../data' }
    ]
  }
})
