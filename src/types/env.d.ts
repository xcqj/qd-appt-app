/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 请求前缀：H5 走 vite 代理 /dev-api，小程序为空串直连 */
  readonly VITE_APP_BASE_API: string
  /** app 客户端 client_id（sys_client 表；与 admin 的 pc 客户端不同） */
  readonly VITE_APP_CLIENT_ID: string
  /** RSA 公钥（仅用于 /auth/login 的 encrypt-key 头；私钥绝不在前端） */
  readonly VITE_APP_RSA_PUBLIC_KEY: string
  /** 'true' 时登录报文走 AES + RSA 加密 */
  readonly VITE_APP_ENCRYPT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<{}, {}, any>
  export default component
}
