/**
 * 分诊组 E1–E3（契约 §7.1–§7.3，`@SaCheckRole("triage")`）
 *
 * 硬约束：**请求不带 `campusId`**，数据范围由服务端按账号解析（红线 10）。
 * 前端只负责「扫码拿到 registrationNo」或「手输单号」，不判断窗口。
 */
import type {
  SignListQuery,
  SignListVo,
  SignResultVo,
  SuspendReportBody,
  SuspendReportVo,
  TriageSignBody,
} from '@/api/appt/types'
import type { PageResult } from '@/types/api'
import { request } from '@/utils/request'

function query(params: Record<string, string | number | undefined>): string {
  const parts: string[] = []
  Object.keys(params).forEach((key) => {
    const value = params[key]
    if (value === undefined || value === '') {
      return
    }
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  })
  return parts.length ? `?${parts.join('&')}` : ''
}

/** E1 扫码签到（`registrationNo` = 就诊码内容） */
export function signByScan(body: TriageSignBody): Promise<SignResultVo> {
  return request<SignResultVo>({
    url: '/appt/triage/sign',
    method: 'POST',
    data: { ...body },
    silent: true,
  })
}

/** E2 手动补签（与 E1 共用状态边与 CAS，仅 `sign_type` 区分） */
export function signManually(body: TriageSignBody): Promise<SignResultVo> {
  return request<SignResultVo>({
    url: '/appt/triage/sign/manual',
    method: 'POST',
    data: { ...body },
    silent: true,
  })
}

/**
 * E5 停诊上报（只登记，不执行退号退款）
 *
 * 同范围若已有「待处理」登记，后端直接复用批号并返回 `duplicate=true`（幂等）。
 * 真正的批量退号 / 退款 / 通知由后台「停诊处理」执行。
 */
export function reportSuspend(body: SuspendReportBody): Promise<SuspendReportVo> {
  return request<SuspendReportVo>({
    url: '/appt/triage/suspend',
    method: 'POST',
    data: { ...body },
    silent: true,
  })
}

/** E3 当日签到列表（`date` 缺省今天；格式非法后端 400） */
export function listSignRecords(params: SignListQuery = {}): Promise<PageResult<SignListVo>> {
  return request<PageResult<SignListVo>>({
    url: `/appt/triage/sign/list${query({
      date: params.date,
      pageNum: params.pageNum,
      pageSize: params.pageSize,
    })}`,
    silent: true,
  })
}
