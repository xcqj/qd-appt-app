import { fileURLToPath, URL } from 'node:url'

import Components from '@uni-helper/vite-plugin-uni-components'
import uni from '@dcloudio/vite-plugin-uni'
import { defineConfig, loadEnv } from 'vite'

import { WotResolver } from './src/resolvers/wot-ui-resolver'

// 顺序要求：Components() 必须在 uni() 之前，否则 Wot UI 组件在 H5 下样式不注入
// 代理目标可用 `VITE_PROXY_TARGET` 覆盖（截图脚本要指向关验证码的 18082 实例），默认仍是 8082
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://127.0.0.1:8082'

  return {
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
        target: proxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dev-api/, ''),
      },
    },
  },
  }
})
