import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pluginUpload } from './server/upload.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), pluginUpload()],
  resolve: {
    alias: { '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src') },
  },
  server: {
    allowedHosts: ['portfolio-cognitive-deforest.ngrok-free.dev']
  }
})
