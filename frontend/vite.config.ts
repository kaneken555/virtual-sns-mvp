import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// http://localhost:8000 へのAPI通信をプロキシ
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
