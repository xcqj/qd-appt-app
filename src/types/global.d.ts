/**
 * 补充全局声明
 *
 * Wot UI 的部分组件（如 wd-qr-code）在小程序分支里直接用 `wx.*` 原生 API，
 * H5 下不会执行，但类型检查会报「Cannot find name 'wx'」。
 */
declare const wx: {
  [key: string]: any
}
