/**
 * RSA 公钥加密（仅用于 /auth/login 的 `encrypt-key` 头）
 *
 * 后端 `CryptoFilter` 对 `@ApiEncrypt` 接口的硬规则：**缺 `encrypt-key` 头直接 403**。
 * 这里只放公钥（`VITE_APP_RSA_PUBLIC_KEY`），私钥永远不进前端。
 *
 * 小程序端风险：`jsencrypt` 依赖 `window`/`navigator`，个别基础库下会抛错。
 * 出现时按 AGENTS.md 的备选方案处理（`wxmp-rsa`，或三处一致关闭加密）。
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
