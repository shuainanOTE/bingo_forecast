import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue' // 注意這裡是 @vitejs/plugin-vue
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
})