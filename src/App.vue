<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'

import { bootstrap } from '@/bootstrap'
import { refreshUnreadBadge } from '@/composables/useUnreadBadge'
import { setupH5Fallback } from '@/router/h5-fallback'

onLaunch(() => {
  bootstrap()
  // H5 错链兜底（小程序端为空实现，见 DESIGN §9.12）
  setupH5Fallback()
})

// 回到前台时刷新「消息」tab 未读角标（未登录时内部自动清零，不会报错）
onShow(() => {
  void refreshUnreadBadge()
})
</script>

<style lang="scss">
/* Wot UI 2.x 主题变量（--wot-*）：必须全局引入一次，组件自身的样式依赖这些变量 */
@use '@wot-ui/ui/styles/theme/index.scss' as *;
/* 设计 token 与公共 class（DESIGN.md §2–§4）；页面不得再写裸 hex */
@use './styles/appt.scss' as *;
</style>
