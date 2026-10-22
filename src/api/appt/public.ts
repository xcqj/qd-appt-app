/**
 * 公开查询组 A1–A7（匿名可访问，`auth: false` 不带 token）
 *
 * 只做「路径 + 参数 + 泛型」，不做业务分支；错误由页面 catch 后按 bizCode 映射文案。
 * 请求层没有 `params` 字段，查询串在这里统一拼（只拼已定义且非空的值）。
 */
import type {
  CampusVo,
  DateVo,
  DeptTreeVo,
  ScheduleStaffQuery,
  ScheduleStaffVo,
  SlotQuery,
  SlotVo,
  StaffDetailVo,
  StaffQuery,
  StaffVo,
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

/** A1 院区列表（定长 3 项，不分页） */
export function listCampus(): Promise<CampusVo[]> {
  return request<CampusVo[]>({ url: '/appt/public/campus/list', auth: false, silent: true })
}

/** A2 科室三级树（按院区过滤，剪掉无出诊人员的枝） */
export function getDeptTree(campusId: string): Promise<DeptTreeVo[]> {
  return request<DeptTreeVo[]>({ url: `/appt/public/dept/tree${query({ campusId })}`, auth: false, silent: true })
}

/** A3 医生列表（本组唯一分页端点） */
export function listStaff(params: StaffQuery): Promise<PageResult<StaffVo>> {
  return request<PageResult<StaffVo>>({
    url: `/appt/public/staff/list${query({
      deptId: params.deptId,
      campusId: params.campusId,
      keyword: params.keyword,
      pageNum: params.pageNum,
      pageSize: params.pageSize,
    })}`,
    auth: false,
    silent: true,
  })
}

/** A4 医生主页（`favorited` 依赖登录态，故不传 auth:false——无 token 时后端按未登录处理） */
export function getStaffDetail(staffId: string): Promise<StaffDetailVo> {
  return request<StaffDetailVo>({ url: `/appt/public/staff/${staffId}`, silent: true })
}

/** A5 日期栏（deptId / staffId 二选一，定长 7 天） */
export function getScheduleDates(params: { deptId?: string; staffId?: string }): Promise<DateVo[]> {
  return request<DateVo[]>({
    url: `/appt/public/schedule/dates${query({ deptId: params.deptId, staffId: params.staffId })}`,
    auth: false,
    silent: true,
  })
}

/** A6 按排班：当日出诊医生 + 各午别余量 + scheduleId（A7 入参来源） */
export function getScheduleStaffs(params: ScheduleStaffQuery): Promise<ScheduleStaffVo[]> {
  return request<ScheduleStaffVo[]>({
    url: `/appt/public/schedule/staffs${query({ deptId: params.deptId, date: params.date })}`,
    auth: false,
    silent: true,
  })
}

/** A7 可约时间点（只返回 AVAILABLE，按 timePoint 升序） */
export function listSlots(params: SlotQuery): Promise<SlotVo[]> {
  return request<SlotVo[]>({
    url: `/appt/public/slot/list${query({ scheduleId: params.scheduleId, period: params.period })}`,
    auth: false,
    silent: true,
  })
}
