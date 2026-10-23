/**
 * RSA 公钥加密（仅用于 /auth/login 的 `encrypt-key` 头）
 *
 * 后端 `CryptoFilter` 对 `@ApiEncrypt` 接口的硬规则：**缺 `encrypt-key` 头直接 403**。
 * 这里只放公钥（`VITE_APP_RSA_PUBLIC_KEY`），私钥永远不进前端。
 *
 * 小程序端注意事项：
 * - `jsencrypt` 依赖 `window`/`navigator`，但库内部有 `typeof navigator` 守卫，实测真机可用；
 * - **不要改成 `await import('jsencrypt')`**：uni-app 的 mp-weixin 构建会把动态 `import()`
 *   编译成对 CJS 模块的 `require(...)` 再 `.then(...)`，运行时抛
 *   `"/common/vendor.js" is not a function`（2026-10-23 真机登录实测），H5 分包收益远小于这个坑；
 * - 若某基础库下 `jsencrypt` 仍不可用，按 AGENTS.md 换 `wxmp-rsa`，或三处一致关闭加密。
 */
import { JSEncrypt } from 'jsencrypt'

const publicKey = import.meta.env.VITE_APP_RSA_PUBLIC_KEY

export function rsaEncrypt(text: string): string {
  if (!publicKey) {
    throw new Error('缺少 VITE_APP_RSA_PUBLIC_KEY，无法加密登录报文')
  }
  const encryptor = new JSEncrypt()
  encryptor.setPublicKey(publicKey)
  const result = encryptor.encrypt(text)
  if (!result) {
    throw new Error('RSA 加密失败（公钥可能不合法）')
  }
  return result
}
