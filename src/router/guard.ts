/**
 * 路由守卫（`uni.addInterceptor` 拦截四类跳转）
 *
 * 规则：
 * 1. 未登录访问受保护页 → 取消本次跳转 + **navigateTo 叠一层登录页**（不 reLaunch，
 *    登录成功后 navigateBack 回到来源页，页面栈与 tabBar 都不丢）
 * 2. 患者身份访问 `/pages/triage/**` → 回患者首页（分诊台只对 triage 角色开放）
 * 3. 分诊身份访问患者页 → 允许（患者功能同样可用）
 *
 * 未登录可进的 tab（S12.5）：预约 / 消息 / 我的 —— 这三页在页内渲染「未登录」态并给登录入口，
 * 避免「点一下就整屏跳走、底栏消失」的体验（DESIGN §8.3）。
 */
import { ROUTES, TAB_PAGES, WHITE_LIST } from '@/router/routes'
import { getStoredUser, getToken } from '@/utils/storage'

const METHODS = ['navigateTo', 'redirectTo', 'reLaunch', 'switchTab'] as const

const TRIAGE_PREFIX = '/pages/triage/'

/** 未登录也能停留的 tab 页（页内自带未登录态） */
const GUEST_TABS: string[] = [ROUTES.registration, ROUTES.notice, ROUTES.mine]

/**
 * 归一化跳转路径。
 *
 * 真机/H5 的 tabBar 点击与部分内部跳转传进来的 url **不一定带前导斜杠**（也有带 `#`
 * 的形态），早先直接 `split('?')[0]` 去比白名单，会把 `/pages/index/index` 判成未知页
 * → 未登录点首页被拦去登录页（2026-10-24 实测踩到）。
 */
function pathOf(url?: string): string {
  let path = (url ?? '').split('?')[0].replace(/^#/, '')
  if (!path) {
    return ''
  }
  if (!path.startsWith('/')) {
    path = `/${path}`
  }
  return path.replace(/\/{2,}/g, '/')
}

function isTriage(): boolean {
  return (getStoredUser()?.roles ?? []).includes('triage')
}

export function setupGuard(): void {
  METHODS.forEach((method) => {
    uni.addInterceptor(method, {
      invoke(args: { url?: string }) {
        const path = pathOf(args.url)
        if (!path) {
          return true
        }

        const logged = Boolean(getToken())

        // tab 页（原生底栏四项）一律放行：底栏可见本身就是「还能去哪」的兜底，
        // 未登录时由页内渲染未登录态（首页白名单、其余见 GUEST_TABS）
        const isTabPage = TAB_PAGES.includes(path)

        if (!logged && !isTabPage && !WHITE_LIST.includes(path) && !GUEST_TABS.includes(path)) {
          // dev 下留痕：拦截原因只看这一行就能定位（生产不打印）
          if (import.meta.env.DEV) {
            console.warn('[guard] 未登录拦截跳转 → 登录页：', path)
          }
          uni.navigateTo({ url: ROUTES.login })
          return false
        }

        if (path.startsWith(TRIAGE_PREFIX) && !isTriage()) {
          uni.switchTab({ url: ROUTES.home })
          return false
        }

        return true
      },
    })
  })
}

export function removeGuard(): void {
  METHODS.forEach((method) => {
    uni.removeInterceptor(method)
  })
}
