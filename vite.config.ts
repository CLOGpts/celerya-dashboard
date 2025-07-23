// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // Importa il modulo 'path' di Node.js

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // --- NUOVA CONFIGURAZIONE ---
  // Aggiungi questa sezione 'resolve' per definire gli alias
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
