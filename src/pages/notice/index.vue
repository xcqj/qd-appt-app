<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue'
</script>

<template>
  <view class="page">
    <EmptyState title="消息" desc="站内信列表 / 未读红点 / 标记已读在 S11 实现（后端 D4–D6 已就绪）" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f7fa;
}
</style>
