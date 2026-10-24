/**
 * 兜底页入口（DESIGN §9.12 / §9.13）
 *
 * 只有两种场景会跳兜底页：
 * 1. `offline` ：首屏接口不可达（`pages/index/index` 的院区列表拿不到）；
 * 2. `notfound`：H5 路由未命中，或业务层确认「该资源不存在」。
 *
 * **不做全局自动跳转**：其余页面的接口失败仍然由 `PageState` 内联展示 + 重试，
 * 弱网时把用户踢出当前上下文（丢掉已选院区/科室）的代价高于收益。
 */
import { ROUTES, reLaunch } from '@/router/routes'

export type FallbackMode = 'notfound' | 'offline'

/** 防抖：避免并发失败时连续 reLaunch 把页面刷成栈底 */
let redirecting = false

export function goFallback(mode: FallbackMode): void {
  if (redirecting) {
    return
  }
  redirecting = true
  reLaunch(ROUTES.fallback, { mode })
  setTimeout(() => {
    redirecting = false
  }, 1500)
}
