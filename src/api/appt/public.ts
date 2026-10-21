import type { CampusVo } from '@/api/appt/types'
import { request } from '@/utils/request'

/** A1 院区列表（匿名可访问，不需要 token） */
export function listCampus(): Promise<CampusVo[]> {
  return request<CampusVo[]>({ url: '/appt/public/campus/list', auth: false })
}
