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
  SLOT_GONE: '该号源已被占用，请重新选择就诊时间',
  LIMIT_PATIENT_DAY: '同一就诊人同一天只能有一个预约',
  BLACKLISTED: '当前账号处于限制预约期，如需帮助请联系门诊服务台',
  OUT_OF_WINDOW: '该日期不在可预约范围内（可预约未来 7 天）',
  SCHEDULE_SUSPENDED: '该医生当日停诊，号源已释放，请选择其他医生或日期',
  REFUND_DEADLINE_PASSED: '已超过退号时限（就诊前一日 23:00）',
  REG_STATE_INVALID: '当前预约状态不支持该操作',
  PATIENT_LIMIT_EXCEEDED: '就诊人数量已达上限（10 人），请先删除不再使用的就诊人',
  PATIENT_IN_USE: '该就诊人存在未完成的预约，暂不可删除',
  PATIENT_ID_CONFLICT: '该证件号已被使用，请核对后重试',
  PAYMENT_CLOSED: '该支付单已关闭',
  DUPLICATE_SUBMIT: '请求正在处理中，请勿重复提交',
  SIGN_TOO_EARLY: '未到签到时间（就诊当日 00:00 起可签到）',
  SIGN_WINDOW_CLOSED: '已超过签到时间（就诊时刻后 30 分钟），或该预约已签到',
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

/* ------------------------------ 患者辅助组 / 分诊展示映射（S11） ------------------------------ */

const NOTICE_TYPE_LABELS: Record<string, string> = {
  BOOK_SUCCESS: '预约成功',
  PAY_SUCCESS: '支付成功',
  PAY_TIMEOUT: '支付超时',
  CANCEL_SUCCESS: '退号成功',
  SUSPEND_CANCEL: '停诊取消',
  NOSHOW_RECORD: '爽约记录',
  BLACKLIST_HIT: '黑名单提醒',
}

/** D4 消息类型线值 → 中文（契约 §6.4：`type` 返回线值，映射在前端） */
export function noticeTypeLabel(type?: string | null): string {
  if (!type) {
    return ''
  }
  return NOTICE_TYPE_LABELS[type] ?? type
}

const SIGN_TYPE_LABELS: Record<string, string> = {
  SCAN: '扫码',
  MANUAL: '手动',
}

/** E1/E2 签到方式线值 → 中文（未签到时后端给 null） */
export function signTypeLabel(signType?: string | null): string {
  if (!signType) {
    return ''
  }
  return SIGN_TYPE_LABELS[signType] ?? signType
}

const SETTLE_STATUS_LABELS: Record<string, string> = {
  NONE: '未结算',
  WAIT_REFUND: '退款处理中',
  REFUNDED: '已退费',
}

export function settleStatusLabel(status?: string | null): string {
  if (!status) {
    return ''
  }
  return SETTLE_STATUS_LABELS[status] ?? status
}

const REFUND_STATUS_LABELS: Record<string, string> = {
  WAIT_REFUND: '退款处理中',
  REFUNDED: '已退款',
  FAILED: '退款失败，请联系服务台',
}

export function refundStatusLabel(status?: string | null): string {
  if (!status) {
    return ''
  }
  return REFUND_STATUS_LABELS[status] ?? status
}

const CANCEL_TYPE_LABELS: Record<string, string> = {
  ACTIVE: '主动退号',
  PASSIVE: '停诊退号',
}

export function cancelTypeLabel(cancelType?: string | null): string {
  if (!cancelType) {
    return ''
  }
  return CANCEL_TYPE_LABELS[cancelType] ?? cancelType
}

/** `yyyy-MM-dd HH:mm:ss` → `MM-DD HH:mm`（消息时间、签到时间用；不参与金额与 id） */
export function shortDateTime(text?: string | null): string {
  if (!text) {
    return ''
  }
  const [date, time] = text.replace('T', ' ').split(' ')
  if (!date) {
    return ''
  }
  const day = date.slice(5)
  const clock = (time ?? '').slice(0, 5)
  return clock ? `${day} ${clock}` : day
}

/** 就诊码只在有效态返回（契约 §4.3）；页面据此决定是否渲染二维码 */
export function canShowVisitCode(status?: string | null): boolean {
  return status === 'BOOKED' || status === 'SIGNED' || status === 'COMPLETED'
}

/** 退号截止：就诊前一日 23:00（毫秒时间戳；日期非法返回 0） */
export function refundDeadline(visitDate: string): number {
  const date = new Date(`${visitDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return 0
  }
  date.setDate(date.getDate() - 1)
  date.setHours(23, 0, 0, 0)
  return date.getTime()
}

/** 是否已过退号截止（`now` 便于单测） */
export function refundDeadlinePassed(visitDate: string, now: number = Date.now()): boolean {
  const deadline = refundDeadline(visitDate)
  return deadline > 0 && now >= deadline
}

/** 截止时刻文案：`10月22日 23:00`（详情页把「就诊前一日 23:00」说具体） */
export function refundDeadlineLabel(visitDate: string): string {
  const deadline = refundDeadline(visitDate)
  if (!deadline) {
    return ''
  }
  const date = new Date(deadline)
  return `${date.getMonth() + 1}月${date.getDate()}日 23:00`
}

/* ------------------------------ 就诊流程五步（S15，DESIGN §8.3） ------------------------------ */

/** 流程节点名：**唯一出处**，首页静态说明与详情页三态条共用（改字只改这里） */
export const REG_STEPS = ['预约', '支付', '签到', '候诊', '就诊'] as const

/** 节点状态：已完成 / 当前 / 未开始 */
export type StepState = 'done' | 'current' | 'pending'

export interface RegStepProgress {
  /** 五个节点的状态；`null` = 不渲染流程条（未知状态 / 终态） */
  states: StepState[] | null
  /** 终态说明：非空时流程条整体不点亮，只显示这一句 */
  terminatedText: string
}

const TERMINATED_TEXT: Record<string, string> = {
  CANCELED_ACTIVE: '本次预约已退号，就诊流程已终止',
  CANCELED_PASSIVE: '因医生停诊已退号，就诊流程已终止',
  CLOSED: '本次预约已关闭，就诊流程已终止',
  NOSHOW: '本次预约已爽约，就诊流程已终止',
}

/**
 * 预约状态 → 流程条进度（纯映射，组件只消费结果）
 *
 * - `WAIT_PAY` 支付为当前；`BOOKED` 签到为当前；`SIGNED` 候诊为当前；`COMPLETED` 全部已完成
 * - 四个终态只给终止说明，**不点亮任何节点**（不能让已退号的单看起来停在某一步）
 * - 未知状态一律不渲染：宁可不显示，也不误报阶段
 */
export function regStepProgress(status?: string | null): RegStepProgress {
  switch (status) {
    case 'WAIT_PAY':
      return { states: ['done', 'current', 'pending', 'pending', 'pending'], terminatedText: '' }
    case 'BOOKED':
      return { states: ['done', 'done', 'current', 'pending', 'pending'], terminatedText: '' }
    case 'SIGNED':
      return { states: ['done', 'done', 'done', 'current', 'pending'], terminatedText: '' }
    case 'COMPLETED':
      return { states: ['done', 'done', 'done', 'done', 'done'], terminatedText: '' }
    default:
      return { states: null, terminatedText: TERMINATED_TEXT[status ?? ''] ?? '' }
  }
}
