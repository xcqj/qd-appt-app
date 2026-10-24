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
 * 归一化跳转路径（守卫判权限前必须先过这里，不要各写一套 `split('?')`）。
 *
 * 四步，缺一步都会误判：
 * 1. **切 query**：浏览链路大量带参（`/pages/doctor/detail?staffId=…`、`?deptId=…`、
 *    `?date=…`），白名单里存的是纯页面路径，不切就永远匹配不上——未登录浏览医生主页、
 *    选科室、选时间会被误拦去登录页。
 * 2. **去 `#`**：hash 路由形态传进来的可能是 `#/pages/x`。
 * 3. **尾部斜杠归一**：`/pages/x/` 与 `/pages/x` 是同一页。
 * 4. **根路径折算首页**：H5 tabBar 点「首页」传的就是 `/`（首页即根路由）。
 */
function pathOf(url?: string): string {
  let path = (url ?? '').split('?')[0].replace(/^#/, '')
  if (!path) {
    return ''
  }
  if (path === '/') {
    return ROUTES.home
  }
  path = path.replace(/\/+$/, '')
  if (!path) {
    return ROUTES.home
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
