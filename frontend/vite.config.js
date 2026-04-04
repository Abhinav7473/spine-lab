import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Forward /api/* to FastAPI as-is — no rewrite needed since backend expects /api/*
      '/api': {
        target:       'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
