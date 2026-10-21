/**
 * AES/ECB/PKCS7 加解密（与后端 api-decrypt 对齐），移植自 `admin/src/utils/crypto.ts`。
 *
 * 与 admin 的差异：小程序端没有 `btoa/atob`，`crypto.getRandomValues` 也可能缺失，
 * 因此 base64 与随机数都用纯 JS 实现，保证 H5 / 小程序同一套代码。
 */
import { ecb } from '@noble/ciphers/aes.js'

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function randomUint8(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  const webCrypto = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined
  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes)
    return bytes
  }
  // 小程序降级：非密码学安全，仅用于会话级 AES 密钥
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256)
  }
  return bytes
}

/** 32 位十六进制字符串（AES-256 密钥材料） */
export function generateRandomString(): string {
  return Array.from(randomUint8(32), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

/** 随机 AES 密钥 */
export function generateAesKey(): Uint8Array {
  return encoder.encode(generateRandomString())
}

export function bytesToBase64(bytes: Uint8Array): string {
  let result = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : undefined
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : undefined
    result += BASE64_CHARS[b0 >> 2]
    result += BASE64_CHARS[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)]
    result += b1 === undefined ? '=' : BASE64_CHARS[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)]
    result += b2 === undefined ? '=' : BASE64_CHARS[b2 & 0x3f]
  }
  return result
}

export function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/[^A-Za-z0-9+/]/g, '')
  const output = new Uint8Array(Math.floor((clean.length * 3) / 4))
  let buffer = 0
  let bits = 0
  let index = 0
  for (const char of clean) {
    buffer = (buffer << 6) | BASE64_CHARS.indexOf(char)
    bits += 6
    if (bits >= 8) {
      bits -= 8
      output[index++] = (buffer >> bits) & 0xff
    }
  }
  return output.subarray(0, index)
}

export function encryptBase64(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
}

export function decryptBase64(str: string): Uint8Array {
  return base64ToBytes(str)
}

export function encryptWithAes(message: string, aesKey: Uint8Array): string {
  return bytesToBase64(ecb(aesKey).encrypt(encoder.encode(message)))
}

export function decryptWithAes(message: string, aesKey: Uint8Array): string {
  return decoder.decode(ecb(aesKey).decrypt(base64ToBytes(message)))
}
