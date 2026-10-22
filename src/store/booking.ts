/**
 * 挂号上下文（院区 → 科室 → 医生 → 日期/午别 → 号源）
 *
 * 为什么必须进 store：`uni.switchTab` 不支持 query，首页 ↔ 我的预约之间无法传参；
 * 且「挂号链路」跨 4 个页面，上下文放 query 会被 `redirectTo` 反复重写。
 *
 * 只存**展示与跳转所需的最小快照**，不缓存接口列表（列表各页自己拉，避免脏读）。
 * 所有 id 一律 `string`（雪花 id 禁 Number）。
 */
import { defineStore } from 'pinia'

const LAST_CAMPUS_KEY = 'appt_last_campus'

export interface CampusRef {
  campusId: string
  name: string
  address?: string
}

export interface DeptRef {
  deptId: string
  name: string
}

export interface StaffRef {
  staffId: string
  name: string
  title?: string
}

export interface SlotRef {
  slotId: string
  timePoint: string
  fee: string
  scheduleId: string
}

interface BookingState {
  campus: CampusRef | null
  dept: DeptRef | null
  staff: StaffRef | null
  visitDate: string
  period: string
  scheduleId: string
  slot: SlotRef | null
  /**
   * 「我的预约」落点意图（一次性）
   *
   * tabBar 页无法通过 query 传参（`switchTab` 不支持、`reLaunch` 到 tab 页也会丢），
   * 支付成功「查看预约」要停在「已预约」而不是默认的「待支付」，只能走 store。
   */
  listIntent: string
}

export const useBookingStore = defineStore('booking', {
  state: (): BookingState => ({
    campus: null,
    dept: null,
    staff: null,
    visitDate: '',
    period: '',
    scheduleId: '',
    slot: null,
    listIntent: '',
  }),
  getters: {
    hasCampus: (state): boolean => Boolean(state.campus),
    campusId: (state): string => state.campus?.campusId ?? '',
  },
  actions: {
    /** 启动时恢复「上次所选院区」，供首页快捷入口与选科室前置判断使用 */
    restoreLastCampus(): CampusRef | null {
      if (this.campus) {
        return this.campus
      }
      try {
        const cached = uni.getStorageSync(LAST_CAMPUS_KEY) as CampusRef | ''
        if (cached && typeof cached === 'object' && cached.campusId) {
          this.campus = cached
          return cached
        }
      } catch {
        /* 存储不可用时静默降级：仅本次会话内有效 */
      }
      return null
    },
    setCampus(campus: CampusRef): void {
      this.campus = campus
      this.dept = null
      this.staff = null
      this.slot = null
      try {
        uni.setStorageSync(LAST_CAMPUS_KEY, campus)
      } catch {
        /* 忽略存储失败，不影响本次选择 */
      }
    },
    setDept(dept: DeptRef): void {
      if (this.dept?.deptId !== dept.deptId) {
        this.staff = null
        this.slot = null
      }
      this.dept = dept
    },
    setStaff(staff: StaffRef): void {
      this.staff = staff
      this.slot = null
    },
    /** A6 返回的 `periods[].scheduleId` 是 A7 的唯一入参来源 */
    selectDay(visitDate: string, period: string, scheduleId: string): void {
      this.visitDate = visitDate
      this.period = period
      this.scheduleId = scheduleId
      this.slot = null
    },
    setSlot(slot: SlotRef): void {
      this.slot = slot
    },
    clearSlot(): void {
      this.slot = null
    },
    /** 设定「我的预约」落点意图（取值是 tab key：WAIT_PAY / BOOKED / COMPLETED / CANCELED） */
    setListIntent(intent: string): void {
      this.listIntent = intent
    },
    /** 取走意图并清空：只生效一次，避免下次进 tab 又被拽到别的 tab */
    takeListIntent(): string {
      const intent = this.listIntent
      this.listIntent = ''
      return intent
    },
    /** 退出登录 / 角色切换时清空，避免串号 */
    reset(): void {
      this.campus = null
      this.dept = null
      this.staff = null
      this.visitDate = ''
      this.period = ''
      this.scheduleId = ''
      this.slot = null
      this.listIntent = ''
    },
  },
})
