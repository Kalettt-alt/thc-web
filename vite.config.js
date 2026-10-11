import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tierListVitePlugin } from './server/tierListVitePlugin.js'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    tierListVitePlugin(loadEnv(mode, process.cwd(), 'VITE_')),
  ],
  build: {
    sourcemap: false
  }
}))