<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue'
</script>

<template>
  <view class="page">
    <EmptyState
      title="我的预约"
      desc="挂号 → 支付 → 我的预约 主链路在 S10 实现（依赖 S9 就诊人接口）"
    />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f7fa;
}
</style>
