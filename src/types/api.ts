/** 后端统一响应包装（RuoYi）：HTTP 恒 200，业务码在 body.code */
export interface ApiResult<T> {
  code: number
  msg: string
  data: T
}

/** 分页结果（与服务端 PageResult 对齐） */
export interface PageResult<T> {
  total: number
  rows: T[]
}

/**
 * 业务错误（非 200 的 body.code，或网络失败）
 *
 * bizCode 来自 `body.data.bizCode`（如 SLOT_GONE / LIMIT_DEPT_DAY / BLACKLISTED），
 * 页面可按它做分支；文案统一走 `api/appt/errors.ts` 的中文映射。
 */
export class BizError extends Error {
  readonly code: number
  readonly bizCode?: string

  constructor(code: number, message: string, bizCode?: string) {
    super(message)
    this.name = 'BizError'
    this.code = code
    this.bizCode = bizCode
  }
}
