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

/* 演示用主色：沉稳蓝绿，覆盖 Wot 默认主题色 */
page {
  --wot-color-theme: #1f7a8c;
  background-color: #f5f7fa;
  color: #1f2d3d;
  font-size: 28rpx;
}
</style>
