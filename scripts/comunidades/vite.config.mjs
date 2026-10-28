import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// Compila solo el visor para comprobar los componentes y los recursos antes de conectarlos a Social.
export default defineConfig({
  root: raiz,
  plugins: [react()],
  build: {
    outDir: resolve(raiz, 'node_modules/.tmp/comunidades-build'),
    emptyOutDir: true,
    rollupOptions: { input: resolve(raiz, 'scripts/comunidades/vista-previa.html') },
  },
})
