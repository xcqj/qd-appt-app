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
import { ROUTES, WHITE_LIST } from '@/router/routes'
import { getStoredUser, getToken } from '@/utils/storage'

const METHODS = ['navigateTo', 'redirectTo', 'reLaunch', 'switchTab'] as const

const TRIAGE_PREFIX = '/pages/triage/'

/** 未登录也能停留的 tab 页（页内自带未登录态） */
const GUEST_TABS: string[] = [ROUTES.registration, ROUTES.notice, ROUTES.mine]

function pathOf(url?: string): string {
  return (url ?? '').split('?')[0]
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

        if (!logged && !WHITE_LIST.includes(path) && !GUEST_TABS.includes(path)) {
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
