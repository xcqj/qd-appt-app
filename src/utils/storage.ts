/**
 * 本地持久化（token / 用户信息）
 *
 * 只用 `uni.*StorageSync`：小程序与 H5 行为一致，不引持久化插件。
 */

const TOKEN_KEY = 'appt_token'
const USER_KEY = 'appt_user'

export interface StoredUser {
  userId?: string
  userName?: string
  nickName?: string
  avatar?: string
  roles?: string[]
}

export function getToken(): string {
  return (uni.getStorageSync(TOKEN_KEY) as string) || ''
}

export function setToken(token: string): void {
  uni.setStorageSync(TOKEN_KEY, token)
}

export function getStoredUser(): StoredUser | null {
  const raw = uni.getStorageSync(USER_KEY)
  if (!raw) {
    return null
  }
  try {
    return typeof raw === 'string' ? (JSON.parse(raw) as StoredUser) : (raw as StoredUser)
  } catch {
    return null
  }
}

export function setStoredUser(user: StoredUser): void {
  uni.setStorageSync(USER_KEY, JSON.stringify(user))
}

export function clearAuth(): void {
  uni.removeStorageSync(TOKEN_KEY)
  uni.removeStorageSync(USER_KEY)
}
