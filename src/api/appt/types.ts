/**
 * API 线值类型（只描述服务端返回的原始结构）
 *
 * 三条硬规则：
 * 1. 所有 id 一律 `string`（19 位雪花超 JS 安全整数，转 number 必丢精度）
 * 2. 金额一律 `string`（后端 BigDecimal 序列化为字符串）
 * 3. 日期 `YYYY-MM-DD`、时刻 `HH:mm`（时间点）/ `YYYY-MM-DD HH:mm:ss`（时间戳）
 *
 * 字段出处：`../docs/api-contract.md` §3（A1–A7）、§4（B1–B3、B6–B7）、§5（C2–C3）。
 * 注意：A3 不返回 clinicType / deptName / intro / 余量，前端不得臆造。
 */

/* ------------------------------ 公开查询组 A1–A7 ------------------------------ */

/** A1 院区（后端 campusId 是 Long，序列化后按字符串处理） */
export interface CampusVo {
  campusId: string
  name: string
  address?: string
  /** 封面原始值（可能是 ossId，也可能是历史直存 URL） */
  coverUrl?: string
  /** 封面可访问 URL（ossId 翻译产物）；展示用 `coverImageUrl || coverUrl` */
  coverImageUrl?: string
}

/** A2 科室树节点（level 1 / 2 / 3） */
export interface DeptTreeVo {
  deptId: string
  parentId: string
  name: string
  level: number
  children?: DeptTreeVo[]
}

/** A3 医生列表行（**无** clinicType / deptName / 余量） */
export interface StaffVo {
  staffId: string
  name: string
  avatar?: string
  avatarUrl?: string
  /** 职称线值：CHIEF / ASSOC_CHIEF / ATTENDING / PHYSICIAN / ASSOC_CHIEF_NURSE */
  title: string
  degree?: string
  campusName?: string
}

/** A4 医生主页 */
export interface StaffDetailVo extends StaffVo {
  deptId: string
  deptName: string
  campusId: string
  campusName: string
  /** 门诊类型线值：NORMAL / NIGHT / EXPERT */
  clinicType: string
  intro?: string
  /** 当前登录账号是否已收藏；未登录固定 false */
  favorited: boolean
}

/** 午别余量项（A5 / A6 共用） */
export interface PeriodRemainVo {
  /** 午别线值：AM / PM / NIGHT */
  period: string
  /** 该午别可约数；0 = 满诊（≠ 无排班） */
  remain: number
  /** 该午别排班 id（A6 恒有；A5 仅 staffId 模式有，deptId 聚合模式为 null） */
  scheduleId?: string | null
}

/** A5 日期栏项 */
export interface DateVo {
  visitDate: string
  hasSchedule: boolean
  periods: PeriodRemainVo[]
}

/** A6 按排班：当日出诊医生 + 各午别余量与排班 id */
export interface ScheduleStaffVo extends StaffVo {
  periods: PeriodRemainVo[]
}

/** A7 可约时间点（只返回可约号源） */
export interface SlotVo {
  slotId: string
  /** HH:mm */
  timePoint: string
  /** 元，两位小数字符串 */
  fee: string
}

/* ------------------------------ 挂号组 B1–B7 ------------------------------ */

/** B1 提交挂号回参 */
export interface BookResultVo {
  registrationId: string
  registrationNo: string
  paymentNo: string
  amount: string
  /** yyyy-MM-dd HH:mm:ss */
  expireTime: string
  staffName: string
  deptName: string
  campusName: string
  visitDate: string
  period: string
  timePoint: string
  /** 幂等回放：true 表示本次是复用首次结果（非失败） */
  duplicate?: boolean
}

/** B2 我的预约行 */
export interface RegistrationRowVo {
  registrationId: string
  registrationNo: string
  patientId: string
  patientName: string
  staffName: string
  deptName: string
  campusName: string
  visitDate: string
  period: string
  timePoint: string
  fee: string
  status: string
  settleStatus?: string
  /** 已签到才有 */
  signTime?: string
  /** 已退号才有：ACTIVE / PASSIVE */
  cancelType?: string
}

/** B3 预约详情（S11 起字段级；`staff` 里**没有 deptId**，再次预约只能经医生主页拿） */
export interface RegistrationDetailVo {
  registrationId: string
  registrationNo: string
  status: string
  settleStatus?: string
  /** 已退号才有：ACTIVE / PASSIVE */
  cancelType?: string
  visitDate: string
  period: string
  /** 已加 @JsonFormat(HH:mm)，仍建议过 timePointText() 兜底 */
  timePoint: string
  fee: string
  /** 已签到才有 */
  signTime?: string
  /** 就诊码：仅 BOOKED / SIGNED / COMPLETED 返回；**不得用 registrationNo 冒替** */
  visitCode?: string
  patient?: {
    patientId: string
    name: string
    idType: string
    /** 脱敏串，完整证件号永不下发 */
    idNoMasked: string
  }
  staff?: {
    staffId: string
    name: string
    title: string
    deptName: string
    campusName: string
  }
  payment?: PaymentBriefVo
  /** 有退款单才有 */
  refund?: RefundBriefVo
}

/** B3 内嵌支付单摘要 */
export interface PaymentBriefVo {
  paymentNo: string
  amount: string
  status: string
  expireTime: string
  payTime?: string
}

/** B3 内嵌退款单摘要 */
export interface RefundBriefVo {
  refundNo: string
  amount: string
  /** WAIT_REFUND / REFUNDED / FAILED */
  status: string
  reason?: string
}

/** B5 退号回参（已支付时带退款单信息） */
export interface RegistrationCancelVo {
  registrationId: string
  registrationNo: string
  status: string
  /** ACTIVE / PASSIVE */
  cancelType?: string
  /** NONE / WAIT_REFUND / REFUNDED */
  settleStatus?: string
  refundNo?: string
  refundStatus?: string
}

/** B6 就诊人（证件号只给脱敏串） */
export interface PatientVo {
  id: string
  name: string
  /** IDCARD / CARD */
  idType: string
  /** 3701**********1234 */
  idNoMasked: string
  isDefault: boolean
  status?: string
  createTime?: string
}

/* ------------------------------ 支付组 C2–C3 ------------------------------ */

/** C2 模拟支付受理结果（accepted 只表示「已受理」，结果靠 C3 轮询） */
export interface MockPayVo {
  paymentNo: string
  accepted: boolean
  status: string
}

/** C3 支付单 */
export interface PaymentVo {
  paymentNo: string
  amount: string
  /** WAIT_PAY / PAID / CLOSED / REFUNDED */
  status: string
  expireTime: string
  payTime?: string
  tradeNo?: string
}

/* ------------------------------ 患者辅助组 D1–D6 ------------------------------ */

/** D1 我的医生（收藏行；按收藏时间倒序） */
export interface FavoriteStaffVo {
  staffId: string
  name: string
  avatar?: string
  avatarUrl?: string
  title: string
  degree?: string
  /** NORMAL / NIGHT / EXPERT */
  clinicType?: string
  deptName?: string
  campusName?: string
  /** yyyy-MM-dd HH:mm:ss */
  favoriteTime?: string
}

/** D4 站内消息 */
export interface NoticeVo {
  noticeId: string
  /** BOOK_SUCCESS / PAY_SUCCESS / PAY_TIMEOUT / CANCEL_SUCCESS / SUSPEND_CANCEL / NOSHOW_RECORD / BLACKLIST_HIT */
  type: string
  title: string
  content: string
  readFlag: boolean
  /** yyyy-MM-dd HH:mm:ss */
  createTime: string
}

/** D5 未读数 */
export interface NoticeUnreadVo {
  unread: number
}

/* ------------------------------ 分诊组 E1–E3 ------------------------------ */

/** E1 扫码签到 / E2 手动补签入参（服务端两者共用同一 BO） */
export interface TriageSignBody {
  registrationNo?: string
  registrationId?: string
}

/** E1/E2 签到结果 */
export interface SignResultVo {
  registrationId: string
  registrationNo: string
  patientName: string
  staffName: string
  visitDate: string
  period: string
  /** 已加 @JsonFormat(HH:mm)（2026-10-24 补齐）；仍建议过 timePointText() 兜底 */
  timePoint: string
  signTime?: string
  /** SCAN / MANUAL */
  signType?: string
}

/**
 * E5 停诊上报请求体（契约 §7.5）
 *
 * `scopeValue` 三种拼法：`SCHEDULE` → scheduleId；`STAFF_DATE` → `yyyy-MM-dd`；
 * `CAMPUS_DATE` → `campusId:yyyy-MM-dd`。区间可另传 `endDate`（与 scopeValue 内的 `~` 二选一）。
 * 单午别停诊不收 `endDate`（后端会拒绝）。
 */
export interface SuspendReportBody {
  staffId?: string
  scopeType: 'SCHEDULE' | 'STAFF_DATE' | 'CAMPUS_DATE'
  scopeValue: string
  endDate?: string
  /** 必填，会出现在患者站内信里 */
  reason: string
}

/** E5 停诊上报回参（同范围已有待处理登记时 `duplicate=true`，批号复用） */
export interface SuspendReportVo {
  suspendId: string
  batchNo: string
  status: string
  duplicate: boolean
  scopeValue: string
}

/** E3 当日签到列表行（排序：院区 → 科室 → 时刻 → id） */
export interface SignListVo {
  registrationId: string
  registrationNo: string
  patientId: string
  patientName: string
  staffId: string
  staffName: string
  deptId: string
  deptName: string
  campusId: string
  campusName: string
  visitDate: string
  period: string
  timePoint: string
  status: string
  signTime?: string
  /** SCAN / MANUAL；未签到为 null */
  signType?: string
}

/* ------------------------------ 输入侧类型（Form / Query） ------------------------------ */

/** A3 查询入参（引用字段按字符串透传，禁止 Number） */
export interface StaffQuery {
  deptId: string
  campusId: string
  keyword?: string
  pageNum?: number
  pageSize?: number
}

/** A6 查询入参 */
export interface ScheduleStaffQuery {
  deptId: string
  date: string
}

/** A7 查询入参 */
export interface SlotQuery {
  scheduleId: string
  period: string
}

/** B1 提交挂号请求体（金额与排班信息全部由服务端推导） */
export interface BookForm {
  slotId: string
  patientId: string
}

/** B2 查询入参（status 必填，服务端按单状态过滤） */
export interface RegistrationQuery {
  status: string
  patientId?: string
  pageNum?: number
  pageSize?: number
}

/** B7 新增就诊人请求体 */
export interface PatientForm {
  name: string
  idType: string
  idNo: string
  isDefault: boolean
}

/**
 * B8 修改就诊人请求体
 *
 * `idNo` 留空 = 不修改；`idType` 若变更必须同时带 `idNo`（后端 400：
 * 类型与摘要必须成对变更，否则唯一键语义错位）。
 */
export interface PatientEditForm {
  name: string
  idType: string
  idNo?: string
}

/** D1 我的医生查询入参 */
export interface FavoriteQuery {
  pageNum?: number
  pageSize?: number
}

/** D4 消息查询入参（`readFlag` 不传 = 全部） */
export interface NoticeQuery {
  readFlag?: boolean
  pageNum?: number
  pageSize?: number
}

/** E3 当日签到列表查询入参（`date` 缺省今天，格式非法后端 400） */
export interface SignListQuery {
  date?: string
  pageNum?: number
  pageSize?: number
}

/* ------------------------------ 认证相关（沿用 E5） ------------------------------ */

/** 图形验证码 */
export interface CaptchaVo {
  captchaEnabled: boolean
  uuid: string
  img: string
}

/** 登录入参（/auth/login，走加密） */
export interface LoginParams {
  username: string
  password: string
  code: string
  uuid: string
  clientId: string
  grantType: string
}

/** 登录响应 */
export interface LoginResult {
  access_token: string
  expires_in: number
}

/** 当前登录用户信息（/system/user/getInfo） */
export interface UserInfoResult {
  user: {
    userId: string
    userName: string
    nickName?: string
    avatar?: string
  }
  roles: string[]
  permissions: string[]
}
