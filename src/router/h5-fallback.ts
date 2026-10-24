/**
 * H5 路由兜底（仅 H5，条件编译）
 *
 * 小程序没有「路由未命中」的概念：错链根本进不去，参数缺失由业务层判定后
 * `goFallback('notfound')`。H5 则可能停在空白页，所以启动时校验一次 hash 路由，
 * 命中未注册页面就换到兜底页。
 *
 * 部署侧注意（S16）：反代需把未命中路径 rewrite 到本应用入口，兜底才完整生效。
 */
import { ROUTES } from '@/router/routes'

const KNOWN_PATHS = new Set<string>(Object.values(ROUTES))

export function setupH5Fallback(): void {
  // #ifdef H5
  const path = window.location.hash.replace(/^#/, '').split('?')[0]
  if (!path || !path.startsWith('/pages/') || KNOWN_PATHS.has(path)) {
    return
  }
  // 启动阶段路由尚未就绪，推到下一轮事件循环再跳，避免被初始导航覆盖
  setTimeout(() => {
    uni.reLaunch({ url: `${ROUTES.fallback}?mode=notfound` })
  }, 0)
  // #endif
}
