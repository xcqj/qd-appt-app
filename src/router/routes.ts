/**
 * 路由表（手写，不引 vite-plugin-uni-pages：避免与模板 vite 版本矩阵耦合）
 *
 * 注意：`uni.switchTab` **不支持 query**，tab 页之间不要传参；
 * 院区 / 科室 / 医生 / 号源上下文统一进 `store/booking`（S10 起）。
 *
 * 栈纪律（DESIGN §7 / 页面栈上限 10）：
 * - 浏览链路（首页 → 院区 → 科室 → 医生 → 排班 → 选时间）用 navigateTo，保留返回语义；
 * - 挂号链路（选时间 → 确认预约 → 支付）用 redirectTo 收敛，成功后 reLaunch 到「我的预约」。
 */

export const ROUTES = {
  home: '/pages/index/index',
  registration: '/pages/registration/index',
  notice: '/pages/notice/index',
  mine: '/pages/mine/index',
  login: '/pages/login/index',
  campus: '/pages/campus/index',
  dept: '/pages/dept/index',
  doctorList: '/pages/doctor/list',
  doctorDetail: '/pages/doctor/detail',
  schedule: '/pages/schedule/index',
  slots: '/pages/schedule/slots',
  bookingConfirm: '/pages/booking/confirm',
  bookingPayment: '/pages/booking/payment',
  triageSign: '/pages/triage/sign/index',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

/**
 * 匿名可访问页面：公开查询组 A1–A7 的全部浏览页 + 登录页
 *
 * 只读浏览不强制登录；真正写操作（提交挂号 / 支付 / 我的预约）仍在守卫外并被后端 `@SaCheckLogin` 兜底。
 */
export const WHITE_LIST: string[] = [
  ROUTES.home,
  ROUTES.login,
  ROUTES.campus,
  ROUTES.dept,
  ROUTES.doctorList,
  ROUTES.doctorDetail,
  ROUTES.schedule,
  ROUTES.slots,
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

export function navigateBack(delta = 1) {
  return uni.navigateBack({ delta })
}
