import type { CaptchaVo, LoginParams, LoginResult, UserInfoResult } from '@/api/appt/types'
import { postEncrypted, request } from '@/utils/request'

const CLIENT_ID = import.meta.env.VITE_APP_CLIENT_ID

/** 图形验证码（全局开启，见后端 captcha.enable） */
export function getCaptcha(): Promise<CaptchaVo> {
  return request<CaptchaVo>({ url: '/auth/code', auth: false })
}

/**
 * 密码登录（加密报文）
 *
 * 后端 `/auth/login` 带 `@ApiEncrypt`：**缺 `encrypt-key` 头直接 403**，
 * 所以这里必须走 `postEncrypted`，不能退化成普通 request。
 */
export function loginByPassword(params: Omit<LoginParams, 'clientId' | 'grantType'>): Promise<LoginResult> {
  return postEncrypted<LoginResult>('/auth/login', {
    ...params,
    clientId: CLIENT_ID,
    grantType: 'password',
  })
}

/** 当前登录用户 + 角色（角色决定落在患者端还是分诊台） */
export function getInfo(): Promise<UserInfoResult> {
  return request<UserInfoResult>({ url: '/system/user/getInfo' })
}

/** 退出登录（失败也不阻塞本地清态） */
export function logout(): Promise<void> {
  return request<void>({ url: '/auth/logout', method: 'POST', silent: true })
}
