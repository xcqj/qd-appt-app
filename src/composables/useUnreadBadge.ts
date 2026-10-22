/**
 * 「消息」tabBar 未读角标（D5）
 *
 * 刷新时机：登录成功、App `onShow`、消息页 `onShow`、标记已读后、退出登录（清零）。
 * `uni.setTabBarBadge` 在非 tabBar 页面会失败（部分端直接抛错），统一 try/catch 降级，
 * 角标只是提示，绝不能因为拿不到未读数而挡住页面。
 */
import { getUnreadCount } from '@/api/appt/notice'
import { getToken } from '@/utils/storage'

/** pages.json 里 tabBar 顺序：首页 0 / 预约 1 / 消息 2 / 我的 3 */
const MESSAGE_TAB_INDEX = 2

function applyBadge(unread: number): void {
  try {
    if (unread > 0) {
      uni.setTabBarBadge({
        index: MESSAGE_TAB_INDEX,
        text: unread > 99 ? '99+' : String(unread),
        fail: () => undefined,
      })
      return
    }
    uni.removeTabBarBadge({ index: MESSAGE_TAB_INDEX, fail: () => undefined })
  } catch {
    /* 忽略：角标不是关键路径 */
  }
}

/** 清掉角标（退出登录 / 未登录时） */
export function clearUnreadBadge(): void {
  applyBadge(0)
}

/** 拉一次未读数并刷新角标，返回未读数（失败按 0 处理） */
export async function refreshUnreadBadge(): Promise<number> {
  if (!getToken()) {
    clearUnreadBadge()
    return 0
  }
  try {
    const result = await getUnreadCount()
    const unread = result?.unread ?? 0
    applyBadge(unread)
    return unread
  } catch {
    return 0
  }
}
