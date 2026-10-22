/**
 * 挂号组 B1–B7（全部登录，服务端按登录账号强过滤）
 *
 * 写操作一律 `silent: true`：文案由页面按 `data.bizCode` 走 DESIGN §8.2 的唯一映射表，
 * 避免请求层先弹一次原始 msg、页面再弹一次。
 */
import type {
  BookForm,
  BookResultVo,
  PatientEditForm,
  PatientForm,
  PatientVo,
  PaymentVo,
  RegistrationCancelVo,
  RegistrationDetailVo,
  RegistrationQuery,
  RegistrationRowVo,
} from '@/api/appt/types'
import type { PageResult } from '@/types/api'
import { newIdempotencyKey, request } from '@/utils/request'

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

/**
 * B1 提交挂号（`Idempotency-Key` 必填，缺失服务端返回 400）
 *
 * 幂等命中时响应仍是 code=200 且 `duplicate=true`——页面按成功渲染并提示「已提交过」。
 */
export function bookRegistration(form: BookForm): Promise<BookResultVo> {
  return request<BookResultVo>({
    url: '/appt/patient/registration',
    method: 'POST',
    data: { slotId: form.slotId, patientId: form.patientId },
    headers: { 'Idempotency-Key': newIdempotencyKey() },
    silent: true,
  })
}

/** B2 我的预约列表（`status` 必填，一次查一个状态） */
export function listRegistrations(params: RegistrationQuery): Promise<PageResult<RegistrationRowVo>> {
  return request<PageResult<RegistrationRowVo>>({
    url: `/appt/patient/registration/list${query({
      status: params.status,
      patientId: params.patientId,
      pageNum: params.pageNum,
      pageSize: params.pageSize,
    })}`,
    silent: true,
  })
}

/** B3 预约详情（仅本人可见；`visitCode` 只在有效态返回） */
export function getRegistrationDetail(registrationId: string): Promise<RegistrationDetailVo> {
  return request<RegistrationDetailVo>({ url: `/appt/patient/registration/${registrationId}`, silent: true })
}

/**
 * B5 退号（仅 `BOOKED` 且未过「就诊前一日 23:00」）
 *
 * 已支付的单会在同事务内建退款单（`settleStatus=WAIT_REFUND`），渠道退款在事务提交后异步走。
 */
export function cancelRegistration(registrationId: string): Promise<RegistrationCancelVo> {
  return request<RegistrationCancelVo>({
    url: `/appt/patient/registration/${registrationId}/cancel`,
    method: 'POST',
    silent: true,
  })
}

/**
 * B4 待支付取消（不走退款，终态 CLOSED）
 *
 * 返回关单后的支付单状态：若此前已支付/已关闭，服务端直接回当前状态（幂等、不报错），
 * 页面必须按 `status` 决定提示语，不能一律当「已取消」。
 */
export function cancelUnpaidPayment(paymentNo: string): Promise<PaymentVo> {
  return request<PaymentVo>({ url: `/appt/patient/payment/${paymentNo}/cancel`, method: 'POST', silent: true })
}

/** B6 就诊人列表（仅 `status='0'`，排序 isDefault → createTime → id） */
export function listPatients(): Promise<PatientVo[]> {
  return request<PatientVo[]>({ url: '/appt/patient/patient/list', silent: true })
}

/** B7 新增就诊人 */
export function addPatient(form: PatientForm): Promise<PatientVo> {
  return request<PatientVo>({ url: '/appt/patient/patient', method: 'POST', data: { ...form }, silent: true })
}

/**
 * B8 修改就诊人
 *
 * `idNo` 留空 = 不修改；**改了 `idType` 就必须同时带 `idNo`**（后端 400）。
 */
export function updatePatient(id: string, form: PatientEditForm): Promise<PatientVo> {
  return request<PatientVo>({ url: `/appt/patient/patient/${id}`, method: 'PUT', data: { ...form }, silent: true })
}

/** B9 删除就诊人（存在 `WAIT_PAY/BOOKED/SIGNED` 单时后端返回 `PATIENT_IN_USE`） */
export function deletePatient(id: string): Promise<void> {
  return request<void>({ url: `/appt/patient/patient/${id}`, method: 'DELETE', silent: true })
}

/** B10 设默认（幂等；同事务只保留一条默认） */
export function setDefaultPatient(id: string): Promise<void> {
  return request<void>({ url: `/appt/patient/patient/${id}/default`, method: 'PUT', silent: true })
}
