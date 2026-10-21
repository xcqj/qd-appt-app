/**
 * API 线值类型（只描述服务端返回的原始结构）
 *
 * 三条硬规则：
 * 1. 所有 id 一律 `string`（19 位雪花超 JS 安全整数，转 number 必丢精度）
 * 2. 金额一律 `string`（后端 BigDecimal 序列化为字符串）
 * 3. 日期 `YYYY-MM-DD`、时刻 `YYYY-MM-DD HH:mm:ss`
 */

/** A1 院区（后端 campusId 是 Long，序列化后按字符串处理） */
export interface CampusVo {
  campusId: string
  name: string
  address?: string
  coverUrl?: string
}

/** 图形验证码 */
export interface CaptchaVo {
  captchaEnabled: boolean
  uuid: string
  img: string
}

/** 登录入参（/auth/login，走加密） */
export interface LoginParams {
  username: string
  password: string
  code: string
  uuid: string
  clientId: string
  grantType: string
}

/** 登录响应 */
export interface LoginResult {
  access_token: string
  expires_in: number
}

/** 当前登录用户信息（/system/user/getInfo） */
export interface UserInfoResult {
  user: {
    userId: string
    userName: string
    nickName?: string
    avatar?: string
  }
  roles: string[]
  permissions: string[]
}
