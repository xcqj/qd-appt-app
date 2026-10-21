/**
 * 路由守卫（`uni.addInterceptor` 拦截四类跳转）
 *
 * 规则：
 * 1. 未登录访问非白名单页 → 取消本次跳转 + 去登录页
 * 2. 患者身份访问 `/pages/triage/**` → 回患者首页（分诊台只对 triage 角色开放）
 * 3. 分诊身份访问患者页 → 允许（患者功能同样可用）
 */
import { ROUTES, WHITE_LIST } from '@/router/routes'
import { getStoredUser, getToken } from '@/utils/storage'

const METHODS = ['navigateTo', 'redirectTo', 'reLaunch', 'switchTab'] as const

const TRIAGE_PREFIX = '/pages/triage/'

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

        if (!logged && !WHITE_LIST.includes(path)) {
          uni.reLaunch({ url: ROUTES.login })
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
