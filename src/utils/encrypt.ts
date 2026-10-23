/**
 * RSA 公钥加密（仅用于 /auth/login 的 `encrypt-key` 头）
 *
 * 后端 `CryptoFilter` 对 `@ApiEncrypt` 接口的硬规则：**缺 `encrypt-key` 头直接 403**。
 * 这里只放公钥（`VITE_APP_RSA_PUBLIC_KEY`），私钥永远不进前端。
 *
 * 小程序端注意事项：
 * 1. `jsencrypt` 依赖 `window`/`navigator`，**只在登录时动态加载**（`await import()`），
 *    不让它进启动链路 —— 否则 `request.ts` 的顶层 import 会把整个库拉进主包，
 *    真机一旦在模块求值期抛错就是全页白屏（`crypto.ts` 的 `TextEncoder` 已踩过同样的坑）。
 * 2. 若某基础库下 `jsencrypt` 仍不可用，按 AGENTS.md 换 `wxmp-rsa`，或三处一致关闭加密。
 */
const publicKey = import.meta.env.VITE_APP_RSA_PUBLIC_KEY

type JsEncryptLike = {
  setPublicKey: (key: string) => void
  encrypt: (text: string) => string | false
}

/**
 * 兼容三种导出形态（不同打包器对 CJS 的 interop 结果不一样，实测都出现过）：
 * 1. ESM 构建：`{ JSEncrypt }` 命名导出；
 * 2. ESM interop：`{ default: { JSEncrypt } }`；
 * 3. CJS 直出：`module.exports` **本身就是构造函数**（`jsencrypt` 的 CJS 产物即如此，`typeof === 'function'`）。
 */
function pickCtor(mod: unknown): (new () => JsEncryptLike) | null {
  if (typeof mod === 'function') {
    return mod as new () => JsEncryptLike
  }
  const box = mod as { JSEncrypt?: unknown; default?: unknown }
  if (typeof box.JSEncrypt === 'function') {
    return box.JSEncrypt as new () => JsEncryptLike
  }
  const fallback = box.default as { JSEncrypt?: unknown } | undefined
  if (fallback && typeof fallback.JSEncrypt === 'function') {
    return fallback.JSEncrypt as new () => JsEncryptLike
  }
  if (typeof box.default === 'function') {
    return box.default as new () => JsEncryptLike
  }
  return null
}

export async function rsaEncrypt(text: string): Promise<string> {
  if (!publicKey) {
    throw new Error('缺少 VITE_APP_RSA_PUBLIC_KEY，无法加密登录报文')
  }
  const mod = await import('jsencrypt')
  const Ctor = pickCtor(mod)
  if (!Ctor) {
    throw new Error('登录加密组件加载失败，请更新客户端后重试')
  }
  const encryptor = new Ctor()
  encryptor.setPublicKey(publicKey)
  const result = encryptor.encrypt(text)
  if (!result) {
    throw new Error('RSA 加密失败（公钥可能不合法）')
  }
  return result
}
