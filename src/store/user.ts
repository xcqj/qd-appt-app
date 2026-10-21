/**
 * 登录态与角色
 *
 * mode 决定落在哪一端：`triage` → 分诊台，`patient` → 患者端。
 * 角色来自服务端 `getInfo().roles`，**不接受前端传入**（红线 10）。
 */
import { defineStore } from 'pinia'

import { getInfo, loginByPassword, logout as logoutApi } from '@/api/appt/auth'
import { clearAuth, getStoredUser, getToken, setStoredUser, setToken } from '@/utils/storage'

export type AppMode = 'patient' | 'triage'

interface LoginPayload {
  username: string
  password: string
  code: string
  uuid: string
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    userId: '',
    userName: '',
    nickName: '',
    roles: [] as string[],
    mode: 'patient' as AppMode,
  }),

  getters: {
    isLogin: (state) => Boolean(state.token),
    isTriage: (state) => state.roles.includes('triage'),
    displayName: (state) => state.nickName || state.userName || '未登录',
  },

  actions: {
    /** 启动时从 storage 恢复（不请求接口，避免闪屏） */
    hydrate() {
      this.token = getToken()
      const cached = getStoredUser()
      if (cached) {
        this.userId = cached.userId || ''
        this.userName = cached.userName || ''
        this.nickName = cached.nickName || ''
        this.roles = cached.roles || []
        this.mode = this.roles.includes('triage') ? 'triage' : 'patient'
      }
    },

    /** 登录 → 取用户信息 → 定落点模式 */
    async login(payload: LoginPayload) {
      const result = await loginByPassword(payload)
      this.token = result.access_token
      setToken(result.access_token)

      const info = await getInfo()
      this.userId = String(info.user.userId ?? '')
      this.userName = info.user.userName ?? ''
      this.nickName = info.user.nickName ?? ''
      this.roles = info.roles ?? []
      this.mode = this.roles.includes('triage') ? 'triage' : 'patient'
      setStoredUser({
        userId: this.userId,
        userName: this.userName,
        nickName: this.nickName,
        roles: this.roles,
      })
      return this.mode
    },

    switchMode(mode: AppMode) {
      this.mode = mode
    },

    async logout() {
      try {
        await logoutApi()
      } catch {
        // 后端失败不影响本地清态
      }
      this.$reset()
      clearAuth()
    },
  },
})
