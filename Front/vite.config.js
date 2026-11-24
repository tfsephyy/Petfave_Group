import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/app-assets/' : '/',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: process.env.BACKEND_URL || 'http://127.0.0.1:8000', changeOrigin: true },
      '/up': { target: process.env.BACKEND_URL || 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  build: { outDir: '../Group-System/public/app-assets', emptyOutDir: true },
}))
