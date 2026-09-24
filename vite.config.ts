import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 项目站点部署在子路径下，构建时需要这个 base
  base: '/Bobozan1/',
  plugins: [react()],
})
