import { fileURLToPath, URL } from 'node:url'

import Components from '@uni-helper/vite-plugin-uni-components'
import uni from '@dcloudio/vite-plugin-uni'
import { defineConfig } from 'vite'

import { WotResolver } from './src/resolvers/wot-ui-resolver'

// 顺序要求：Components() 必须在 uni() 之前，否则 Wot UI 组件在 H5 下样式不注入
export default defineConfig({
  plugins: [Components({ resolvers: [WotResolver()], dts: 'src/components.d.ts' }), uni()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        silenceDeprecations: ['legacy-js-api', 'import'],
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8084, // 8082 后端 / 8083 admin，本仓固定 8084
    proxy: {
      // 前端统一走 /dev-api 前缀，避免跨域；后端无 /dev-api 前缀，需 rewrite 去掉
      '/dev-api': {
        target: 'http://127.0.0.1:8082',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dev-api/, ''),
      },
    },
  },
})
