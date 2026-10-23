/**
 * AES/ECB/PKCS7 加解密（与后端 api-decrypt 对齐），移植自 `admin/src/utils/crypto.ts`。
 *
 * 与 admin 的差异（都是为了小程序端）：
 * - 没有 `btoa/atob` → base64 纯 JS 实现；
 * - 没有 `crypto.getRandomValues` → 随机数降级；
 * - **没有 `TextEncoder/TextDecoder`** → UTF-8 编解码纯 JS 实现。
 *
 * 最后一条是硬要求：本文件被 `utils/request.ts` 顶层 import，而请求层被几乎所有页面
 * 顶层 import。若在这里 `new TextEncoder()`，小程序会在**模块求值阶段**抛
 * `ReferenceError: TextEncoder is not defined`，整页 JS 不执行 → 白屏（2026-10-23 真机实测）。
 * 因此这里不用 Web API，只在可用时用它做加速，不可用时走纯 JS。
 */
import { ecb } from '@noble/ciphers/aes.js'

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** 纯 JS UTF-8 编码（不用 TextEncoder：小程序没有该全局对象） */
function utf8Encode(text: string): Uint8Array {
  const bytes: number[] = []
  for (let i = 0; i < text.length; i += 1) {
    let code = text.charCodeAt(i)
    // 代理对（emoji 等）合并成一个码点
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00)
        i += 1
      }
    }
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      )
    }
  }
  return new Uint8Array(bytes)
}

/** 纯 JS UTF-8 解码（不用 TextDecoder） */
function utf8Decode(bytes: Uint8Array): string {
  let out = ''
  let i = 0
  while (i < bytes.length) {
    const b0 = bytes[i]
    i += 1
    if (b0 < 0x80) {
      out += String.fromCharCode(b0)
    } else if (b0 < 0xe0) {
      out += String.fromCharCode(((b0 & 0x1f) << 6) | (bytes[i] & 0x3f))
      i += 1
    } else if (b0 < 0xf0) {
      out += String.fromCharCode(((b0 & 0x0f) << 12) | ((bytes[i] & 0x3f) << 6) | (bytes[i + 1] & 0x3f))
      i += 2
    } else {
      const cp =
        ((b0 & 0x07) << 18) |
        ((bytes[i] & 0x3f) << 12) |
        ((bytes[i + 1] & 0x3f) << 6) |
        (bytes[i + 2] & 0x3f)
      i += 3
      const v = cp - 0x10000
      out += String.fromCharCode(0xd800 + (v >> 10), 0xdc00 + (v & 0x3ff))
    }
  }
  return out
}

const encoder = { encode: utf8Encode }
const decoder = { decode: utf8Decode }

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
