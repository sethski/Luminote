import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Project files are flat — alias @ to the project root
      '@': path.resolve(__dirname, '.'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
