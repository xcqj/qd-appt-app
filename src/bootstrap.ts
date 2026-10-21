import { createPinia } from 'pinia'

import { setupGuard } from '@/router/guard'
import { useUserStore } from '@/store/user'

/** 显式持有 pinia 实例：`bootstrap` 在组件外调用，必须传实例 */
export const pinia = createPinia()

/** 应用级初始化（App.onLaunch 调用）：恢复登录态 + 安装路由守卫 */
export function bootstrap() {
  useUserStore(pinia).hydrate()
  setupGuard()
}
