import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: './',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
    host: '0.0.0.0',
    allowedHosts: [
      'spies.atyourservice-ai.com',
      'staging.spies.atyourservice-ai.com'
    ],
  },
})
