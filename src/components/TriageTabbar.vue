<script setup lang="ts">
import { ROUTES } from '@/router/routes'

/**
 * 分诊台自绘底栏
 *
 * 为什么不用原生 tabBar：原生 tabBar 在 pages.json 里是静态的，最多 5 项，
 * 患者（4 项）与分诊（4 项）无法并存；`uni.setTabBarItem` 只能改文字/图标，不能增删项。
 * 所以分诊走「普通页面 + 自绘底栏」，页间 `reLaunch` 互跳（不增长页面栈，H5 刷新也能渲染）。
 */
defineProps<{ active: 'sign' | 'list' | 'extra' | 'suspend' }>()

const items = [
  { key: 'sign', label: '签到', path: ROUTES.triageSign, hint: '' },
  { key: 'list', label: '当日', path: ROUTES.triageList, hint: '' },
  // 加号依赖 E4（后端未实现）；停诊上报不在 S11 清单：都保留入口但明确「暂未开放」
  { key: 'extra', label: '加号', path: '', hint: '加号登记功能暂未开放' },
  { key: 'suspend', label: '停诊', path: '', hint: '停诊上报功能暂未开放' },
] as const

function go(path: string, hint: string) {
  if (!path) {
    uni.showToast({ title: hint || '该功能暂未开放', icon: 'none' })
    return
  }
  uni.reLaunch({ url: path })
}
</script>

<template>
  <view class="triage-tabbar">
    <view
      v-for="item in items"
      :key="item.key"
      class="triage-tabbar__item"
      :class="{ 'is-active': active === item.key, 'is-pending': !item.path }"
      @click="go(item.path, item.hint)"
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

    &.is-pending {
      opacity: 0.55;
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
