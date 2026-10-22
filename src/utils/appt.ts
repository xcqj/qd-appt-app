/**
 * 移动端展示映射与格式化（纯函数，无副作用）
 *
 * 硬规则：
 * 1. 金额与雪花 id **一律字符串**，本文件不做任何数值转换（不 Number / 不 parseInt 金额与 id）；
 * 2. 两套号源状态语汇**严禁混用**（红线 6）：
 *    - 排班页 `scheduleAvailability()` → 只有「有排班 / 无排班」
 *    - 医生主页 `doctorAvailabilityLabel()` → 只有「满诊 / 无号」
 * 3. 业务码文案以 DESIGN §8.2 为**唯一**映射表。
 */
import type { DateVo, PeriodRemainVo } from '@/api/appt/types'
import { BizError } from '@/types/api'

/* ------------------------------ 枚举线值 → 中文 ------------------------------ */

const PERIOD_LABELS: Record<string, string> = {
  AM: '上午',
  PM: '下午',
  NIGHT: '夜间',
}

export function periodLabel(period?: string | null): string {
  if (!period) {
    return ''
  }
  return PERIOD_LABELS[period] ?? period
}

const TITLE_LABELS: Record<string, string> = {
  CHIEF: '主任医师',
  ASSOC_CHIEF: '副主任医师',
  ATTENDING: '主治医师',
  PHYSICIAN: '医师',
  ASSOC_CHIEF_NURSE: '副主任护师',
}

export function titleLabel(title?: string | null): string {
  if (!title) {
    return ''
  }
  return TITLE_LABELS[title] ?? title
}

const CLINIC_TYPE_LABELS: Record<string, string> = {
  NORMAL: '普通门诊',
  NIGHT: '夜间延时',
  EXPERT: '知名专家',
}

export function clinicTypeLabel(clinicType?: string | null): string {
  if (!clinicType) {
    return ''
  }
  return CLINIC_TYPE_LABELS[clinicType] ?? clinicType
}

const ID_TYPE_LABELS: Record<string, string> = {
  IDCARD: '身份证',
  CARD: '就诊卡',
}

export function idTypeLabel(idType?: string | null): string {
  if (!idType) {
    return ''
  }
  return ID_TYPE_LABELS[idType] ?? idType
}

const REG_STATUS_LABELS: Record<string, string> = {
  WAIT_PAY: '待支付',
  BOOKED: '已预约',
  SIGNED: '已签到',
  COMPLETED: '已完成',
  CLOSED: '已关闭',
  CANCELED_ACTIVE: '已退号',
  CANCELED_PASSIVE: '已退号（停诊）',
  NOSHOW: '已爽约',
}

export function regStatusLabel(status?: string | null): string {
  if (!status) {
    return ''
  }
  return REG_STATUS_LABELS[status] ?? status
}

/** 状态色语义键（颜色只在 StatusTag.vue / DESIGN §2.3 出现） */
export type StatusTone = 'warn' | 'info' | 'success' | 'neutral' | 'muted' | 'danger'

const REG_STATUS_TONES: Record<string, StatusTone> = {
  WAIT_PAY: 'warn',
  BOOKED: 'info',
  SIGNED: 'success',
  COMPLETED: 'neutral',
  CLOSED: 'muted',
  CANCELED_ACTIVE: 'muted',
  CANCELED_PASSIVE: 'warn',
  NOSHOW: 'danger',
}

export function regStatusTone(status?: string | null): StatusTone {
  if (!status) {
    return 'muted'
  }
  return REG_STATUS_TONES[status] ?? 'muted'
}

const PAY_STATUS_LABELS: Record<string, string> = {
  WAIT_PAY: '待支付',
  PAID: '已支付',
  CLOSED: '已关闭',
  REFUNDED: '已退款',
}

export function payStatusLabel(status?: string | null): string {
  if (!status) {
    return ''
  }
  return PAY_STATUS_LABELS[status] ?? status
}

/* ------------------------------ 业务码 → 中文（DESIGN §8.2） ------------------------------ */

const BIZ_MESSAGES: Record<string, string> = {
  SLOT_GONE: '该时间点刚被约走，换一个试试',
  LIMIT_HOLD_MAX: '你已有 3 个待就诊预约，先完成或取消一个',
  LIMIT_DEPT_DAY: '同一天同一科室只能约 1 个号',
  LIMIT_TIME_CONFLICT: '这个时间你已经有预约了',
  BLACKLISTED: '近期退号/爽约较多，暂不可预约，请联系门诊服务台',
  OUT_OF_WINDOW: '该日期暂未开放预约（可约未来 7 天）',
  SCHEDULE_SUSPENDED: '该医生当日停诊，已为你释放号源',
  REFUND_DEADLINE_PASSED: '已过退号时限（就诊前一日 23:00）',
  REG_STATE_INVALID: '该预约当前状态不支持此操作',
  PATIENT_LIMIT_EXCEEDED: '就诊人已达 10 人上限，先删除不用的',
  PATIENT_IN_USE: '该就诊人还有未完成的预约',
  PATIENT_ID_CONFLICT: '该证件号已被使用，请核对后重试',
  PAYMENT_CLOSED: '该支付单已关闭',
  DUPLICATE_SUBMIT: '正在提交，请勿重复点击',
}

/** 错误 → 用户可读文案（未知码用服务端 msg，无 msg 用兜底） */
export function bizMessage(error: unknown): string {
  if (error instanceof BizError && error.bizCode) {
    const mapped = BIZ_MESSAGES[error.bizCode]
    if (mapped) {
      return mapped
    }
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return '操作失败，请稍后重试'
}

/* ------------------------------ 日期 / 时刻 / 金额展示 ------------------------------ */

function trimLeadingZero(value: string): string {
  return value.startsWith('0') ? value.slice(1) : value
}

/** `2026-10-24` → `10月24日`（纯字符串切片，不经 Date） */
export function formatVisitDate(visitDate: string): string {
  const parts = visitDate.split('-')
  if (parts.length !== 3) {
    return visitDate
  }
  return `${trimLeadingZero(parts[1])}月${trimLeadingZero(parts[2])}日`
}

/** `2026-10-24` → `24`（日期栏日号） */
export function dayNumber(visitDate: string): string {
  const parts = visitDate.split('-')
  return parts.length === 3 ? trimLeadingZero(parts[2]) : visitDate
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** `2026-10-24` → `周五` */
export function weekdayLabel(visitDate: string): string {
  const date = new Date(`${visitDate}T00:00:00`)
  const day = date.getDay()
  return Number.isNaN(day) ? '' : WEEKDAYS[day]
}

/**
 * 时间点展示：统一取 `HH:mm`
 *
 * 契约 §2.4 规定 `timePoint` 输出 `HH:mm`，但 B1/B2/B3 当前返回的是完整
 * `yyyy-MM-dd HH:mm:ss`（VO 用 `LocalDateTime` 且未加 `@JsonFormat`）。
 * 这里做一次防御性归一：两种形态都收敛成 `HH:mm`，后端修好后行为不变。
 */
export function timePointText(value?: string | null): string {
  if (!value) {
    return ''
  }
  const part = value.includes(' ') ? value.split(' ')[1] : value
  return part.slice(0, 5)
}

/** 就诊时间一行文案：`10月24日 上午 09:30` */
export function visitTimeText(visitDate: string, period: string, timePoint: string): string {
  return [formatVisitDate(visitDate), periodLabel(period), timePointText(timePoint)].filter(Boolean).join(' ')
}

/** `yyyy-MM-dd HH:mm:ss` → 毫秒时间戳（仅用于支付倒计时，不参与金额 / id） */
export function parseTimestamp(text?: string | null): number {
  if (!text) {
    return 0
  }
  const date = new Date(text.replace(' ', 'T'))
  const time = date.getTime()
  return Number.isNaN(time) ? 0 : time
}

/* ------------------------------ 号源语汇（两套，禁止互相替代） ------------------------------ */

/** 排班页：`remain > 0` → 有排班；`0` → 无排班（**不写「满诊」**） */
export function scheduleAvailability(remain: number): string {
  return remain > 0 ? '有排班' : '无排班'
}

/** 余量合计（只做后端返回值的求和，不推测缺失午别） */
export function totalRemain(periods: PeriodRemainVo[]): number {
  return periods.reduce((sum, item) => sum + item.remain, 0)
}

/** 医生主页：窗口内无排班 → 无号；首个有排班日余量合计 0 → 满诊；否则不显示标签 */
export function doctorAvailabilityLabel(dates: DateVo[]): '' | '满诊' | '无号' {
  const withSchedule = dates.filter((item) => item.hasSchedule)
  if (!withSchedule.length) {
    return '无号'
  }
  return totalRemain(withSchedule[0].periods) === 0 ? '满诊' : ''
}
