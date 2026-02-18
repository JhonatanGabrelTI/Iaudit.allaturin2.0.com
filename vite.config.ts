import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/infosimples': {
        target: 'https://api.infosimples.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/infosimples/, ''),
      },
    },
  },
})
