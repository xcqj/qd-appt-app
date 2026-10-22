/**
 * 患者辅助组 · 站内消息 D4–D6（契约 §6.4–§6.6，全部登录）
 *
 * `type` 返回**线值**，中文映射在前端（`utils/appt.ts` 的 `noticeTypeLabel`）。
 * 标记已读的三态由后端保证：未读→成功、已读→幂等成功、别人的/不存在→**404**。
 */
import type { NoticeQuery, NoticeUnreadVo, NoticeVo } from '@/api/appt/types'
import type { PageResult } from '@/types/api'
import { request } from '@/utils/request'

function query(params: Record<string, string | number | boolean | undefined>): string {
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

/** D4 消息列表（`readFlag` 不传 = 全部；默认 10/页） */
export function listNotices(params: NoticeQuery = {}): Promise<PageResult<NoticeVo>> {
  return request<PageResult<NoticeVo>>({
    url: `/appt/patient/notice/list${query({
      readFlag: params.readFlag,
      pageNum: params.pageNum,
      pageSize: params.pageSize,
    })}`,
    silent: true,
  })
}

/** D5 未读数（tabBar 角标用） */
export function getUnreadCount(): Promise<NoticeUnreadVo> {
  return request<NoticeUnreadVo>({ url: '/appt/patient/notice/unread-count', silent: true })
}

/** D6 标记已读（别人的 / 不存在 → 404，页面按「该消息不存在或已删除」处理） */
export function markNoticeRead(noticeId: string): Promise<void> {
  return request<void>({ url: `/appt/patient/notice/${noticeId}/read`, method: 'PUT', silent: true })
}
