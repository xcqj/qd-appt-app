/**
 * 统一请求入口（不引 axios / alova，语义完全可控）
 *
 * 后端是 RuoYi：**HTTP 恒 200，业务码在 body.code**
 *   code === 200 → 取 body.data
 *   code === 401 → 清登录态并跳登录（并发只跳一次）
 *   其它         → toast + reject(BizError)，页面可自行 catch 覆盖
 *
 * 红线：金额与 19 位雪花 id 一律字符串，**不做任何数值转换**。
 */
import type { ApiResult } from '@/types/api'
import { BizError } from '@/types/api'
import { encryptBase64, encryptWithAes, generateAesKey } from '@/utils/crypto'
import { rsaEncrypt } from '@/utils/encrypt'
import { clearAuth, getToken } from '@/utils/storage'

const BASE_URL = import.meta.env.VITE_APP_BASE_API || ''
const CLIENT_ID = import.meta.env.VITE_APP_CLIENT_ID
const TIMEOUT = 15000
const DEDUP_WINDOW = 500

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface RequestOptions {
  url: string
  method?: Method
  data?: Record<string, unknown> | string
  headers?: Record<string, string>
  /** 是否携带 Authorization（默认 true；公开接口可传 false） */
  auth?: boolean
  /** 是否静默业务错误（页面自己处理错误提示时用） */
  silent?: boolean
}

/**
 * 并发 401 只跳一次登录页。
 *
 * 不用 `reLaunch`：那会清空页面栈并让 tabBar 消失，用户登录完只能回首页。
 * 改为叠一层登录页（`navigateTo`），登录成功后由登录页 `navigateBack` 回到原页面。
 */
let redirecting = false

function currentPath(): string {
  const pages = getCurrentPages()
  const top = pages[pages.length - 1] as { route?: string } | undefined
  return top?.route ? `/${top.route}` : ''
}

function handleUnauthorized(): void {
  if (redirecting) {
    return
  }
  redirecting = true
  clearAuth()
  const onLogin = currentPath() === '/pages/login/index'
  if (onLogin) {
    setTimeout(() => {
      redirecting = false
    }, 1500)
    return
  }
  uni.navigateTo({
    url: '/pages/login/index',
    fail: () => {
      // 栈满等极端情况兜底
      uni.reLaunch({ url: '/pages/login/index' })
    },
    complete: () => {
      setTimeout(() => {
        redirecting = false
      }, 1500)
    },
  })
}

/** 500ms 内同 method + url + body 视为重复提交（配合后端 Idempotency-Key 双保险） */
const recent = new Map<string, number>()

function dedupKey(method: Method, url: string, data?: unknown): string {
  return `${method}:${url}:${typeof data === 'string' ? data : JSON.stringify(data ?? {})}`
}

export function request<T>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, headers = {}, auth = true, silent = false } = options

  const key = dedupKey(method, url, data)
  const now = Date.now()
  const last = recent.get(key)
  if (last && now - last < DEDUP_WINDOW) {
    return Promise.reject(new BizError(-1, '请勿重复提交'))
  }
  recent.set(key, now)

  const token = getToken()

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data: data as never,
      timeout: TIMEOUT,
      header: {
        'Content-Type': 'application/json',
        clientid: CLIENT_ID,
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      success: (res) => {
        const body = res.data as ApiResult<T> | undefined
        if (res.statusCode === 401 || body?.code === 401) {
          handleUnauthorized()
          reject(new BizError(401, '登录已过期，请重新登录'))
          return
        }
        if (!body) {
          // 非 2xx 且 body 为空，通常是「打到了别的服务」或「地址写错」——
          // 只报「响应为空」会把状态码吞掉，排查时极易误判成后端没响应（2026-10-23 真机踩过：
          // Windows 上 QQ 占用 8082，portproxy 静默失效，接口返回空 body 的 404）。
          const message =
            res.statusCode === 200
              ? '响应为空，请稍后重试'
              : `服务不可达（${res.statusCode}），请检查接口地址或网络`
          if (!silent) {
            uni.showToast({ title: message, icon: 'none' })
          }
          reject(new BizError(res.statusCode, message))
          return
        }
        if (body.code === 200) {
          resolve(body.data)
          return
        }
        const bizCode = (body.data as { bizCode?: string } | null)?.bizCode
        if (!silent) {
          uni.showToast({ title: body.msg || '请求失败', icon: 'none' })
        }
        reject(new BizError(body.code, body.msg || '请求失败', bizCode))
      },
      fail: (err) => {
        if (!silent) {
          uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
        }
        reject(new BizError(-2, err?.errMsg || '网络异常'))
      },
    })
  })
}

/**
 * 加密 POST（仅 /auth/login 使用）
 *
 * 报文格式与 admin 完全一致：
 *   header `encrypt-key` = RSA(base64(aesKey))
 *   body                 = base64(AES(json))
 */
export function postEncrypted<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const aesKey = generateAesKey()
  const encryptKey = rsaEncrypt(encryptBase64(aesKey))
  const encrypted = encryptWithAes(JSON.stringify(body), aesKey)
  return request<T>({
    url,
    method: 'POST',
    data: encrypted,
    headers: { 'encrypt-key': encryptKey },
    auth: false,
  })
}

/**
 * 幂等键（B1 挂号必带）
 *
 * 小程序没有 `crypto.randomUUID`，用时间戳 + 随机串降级，长度足够避免碰撞。
 */
export function newIdempotencyKey(): string {
  const webCrypto = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined
  if (webCrypto && typeof webCrypto.randomUUID === 'function') {
    return webCrypto.randomUUID()
  }
  const rand = Math.random().toString(36).slice(2, 10)
  return `${Date.now().toString(36)}-${rand}`
}
