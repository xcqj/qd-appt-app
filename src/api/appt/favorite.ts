/**
 * 患者辅助组 · 收藏 D1–D3（契约 §6.1–§6.3，全部登录）
 *
 * 幂等锚点在后端 `UNIQUE(user_id, staff_id)`：前端只做按钮 loading，
 * **不自己预判「是否已收藏」**（先查再插在并发下会 500）。
 */
import type { FavoriteQuery, FavoriteStaffVo } from '@/api/appt/types'
import type { PageResult } from '@/types/api'
import { request } from '@/utils/request'

function query(params: Record<string, number | undefined>): string {
  const parts: string[] = []
  Object.keys(params).forEach((key) => {
    const value = params[key]
    if (value === undefined) {
      return
    }
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  })
  return parts.length ? `?${parts.join('&')}` : ''
}

/** D1 我的医生（按收藏时间倒序，默认 20/页） */
export function listFavorites(params: FavoriteQuery = {}): Promise<PageResult<FavoriteStaffVo>> {
  return request<PageResult<FavoriteStaffVo>>({
    url: `/appt/patient/favorite/list${query({ pageNum: params.pageNum, pageSize: params.pageSize })}`,
    silent: true,
  })
}

/** D2 收藏（`true` 本次新增 / `false` 早已收藏，幂等成功；医生不存在 404） */
export function addFavorite(staffId: string): Promise<boolean> {
  return request<boolean>({ url: `/appt/patient/favorite/${staffId}`, method: 'POST', silent: true })
}

/** D3 取消收藏（未收藏过也成功） */
export function removeFavorite(staffId: string): Promise<void> {
  return request<void>({ url: `/appt/patient/favorite/${staffId}`, method: 'DELETE', silent: true })
}
