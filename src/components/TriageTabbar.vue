<script setup lang="ts">
import { ROUTES } from '@/router/routes'

/**
 * 分诊台自绘底栏
 *
 * 为什么不用原生 tabBar：原生 tabBar 在 pages.json 里是静态的，最多 5 项，
 * 患者（4 项）与分诊（4 项）无法并存；`uni.setTabBarItem` 只能改文字/图标，不能增删项。
 * 所以分诊走「普通页面 + 自绘底栏」，页间 `reLaunch` 互跳（不增长页面栈，H5 刷新也能渲染）。
 *
 * 2026-10-23：去掉「加号」项 —— E4 加号登记后端未实现，留一个点了只弹「暂未开放」的入口
 * 会被当成缺陷；将来实现 E4 时在 items 里加回一行即可（`ROUTES.triageExtra` 落位）。
 */
defineProps<{ active: 'sign' | 'list' | 'suspend' }>()

const items = [
  { key: 'sign', label: '签到', path: ROUTES.triageSign },
  { key: 'list', label: '当日', path: ROUTES.triageList },
  { key: 'suspend', label: '停诊', path: ROUTES.triageSuspend },
] as const

function go(path: string) {
  uni.reLaunch({ url: path })
}
</script>

<template>
  <view class="triage-tabbar">
    <view
      v-for="item in items"
      :key="item.key"
      class="triage-tabbar__item"
      :class="{ 'is-active': active === item.key }"
      @click="go(item.path)"
    >
      <view class="triage-tabbar__dot" />
      <text class="triage-tabbar__label">{{ item.label }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.triage-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  height: 100rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background: #ffffff;
  border-top: 1rpx solid #e6ebf2;
  z-index: 99;

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6rpx;
    color: #8a94a6;

    &.is-active {
      color: #1f7a8c;
      font-weight: 600;
    }
  }

  &__dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
    background: currentColor;
  }

  &__label {
    font-size: 24rpx;
  }
}
</style>
