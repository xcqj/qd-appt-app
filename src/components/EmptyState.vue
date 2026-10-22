<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    desc?: string
  }>(),
  {
    title: '功能建设中',
    desc: '该功能将在后续版本开放',
  },
)
</script>

<template>
  <view class="empty-state">
    <view class="empty-state__icon">◻︎</view>
    <view class="empty-state__title">{{ title }}</view>
    <view class="empty-state__desc">{{ desc }}</view>
    <slot />
  </view>
</template>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;

  &__icon {
    font-size: 96rpx;
    color: #c4ccd8;
    margin-bottom: 24rpx;
  }

  &__title {
    font-size: 32rpx;
    font-weight: 600;
    color: #1f2d3d;
  }

  &__desc {
    margin-top: 12rpx;
    font-size: 26rpx;
    color: #8a94a6;
    text-align: center;
    line-height: 1.6;
  }
}
</style>
