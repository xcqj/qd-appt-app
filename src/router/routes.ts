/**
 * 路由表（手写，不引 vite-plugin-uni-pages：避免与模板 vite 版本矩阵耦合）
 *
 * 注意：`uni.switchTab` **不支持 query**，tab 页之间不要传参；
 * 后续院区/科室/医生上下文统一进 store（S10 落地时遵守）。
 */

export const ROUTES = {
  home: '/pages/index/index',
  registration: '/pages/registration/index',
  notice: '/pages/notice/index',
  mine: '/pages/mine/index',
  login: '/pages/login/index',
  triageSign: '/pages/triage/sign/index',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

/** 匿名可访问的页面（公开组 A1–A7 相关） */
export const WHITE_LIST: string[] = [
  ROUTES.home,
  ROUTES.login,
]

/** 原生 tabBar 页面（只能用 switchTab 跳） */
export const TAB_PAGES: string[] = [ROUTES.home, ROUTES.registration, ROUTES.notice, ROUTES.mine]

function buildQuery(query?: Record<string, string | number | undefined>): string {
  if (!query) {
    return ''
  }
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

export function navigateTo(path: string, query?: Record<string, string | number | undefined>) {
  return uni.navigateTo({ url: `${path}${buildQuery(query)}` })
}

export function redirectTo(path: string, query?: Record<string, string | number | undefined>) {
  return uni.redirectTo({ url: `${path}${buildQuery(query)}` })
}

export function switchTab(path: string) {
  return uni.switchTab({ url: path })
}

export function reLaunch(path: string, query?: Record<string, string | number | undefined>) {
  return uni.reLaunch({ url: `${path}${buildQuery(query)}` })
}
