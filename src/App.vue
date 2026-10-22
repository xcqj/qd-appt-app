<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'

import { bootstrap } from '@/bootstrap'

onLaunch(() => {
  bootstrap()
})
</script>

<style lang="scss">
/* Wot UI 2.x 主题变量（--wot-*）：必须全局引入一次，组件自身的样式依赖这些变量 */
@use '@wot-ui/ui/styles/theme/index.scss' as *;
/* 设计 token 与公共 class（DESIGN.md §2–§4）；页面不得再写裸 hex */
@use './styles/appt.scss' as *;
</style>
