<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue'
import TriageTabbar from '@/components/TriageTabbar.vue'
import { ROUTES } from '@/router/routes'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

function backToPatient() {
  uni.switchTab({ url: ROUTES.home })
}
</script>

<template>
  <view class="page">
    <view class="header">
      <view class="header__title">分诊台</view>
      <view class="header__desc">当前账号：{{ userStore.displayName }}</view>
    </view>

    <EmptyState
      title="扫码签到"
      desc="扫码签到 / 手动补签 / 当日列表 在 S11 实现；加号需等 E4（extra-slot 端点）"
    >
      <wd-button size="small" type="primary" plain custom-class="mt-3" @click="backToPatient">
        返回患者端
      </wd-button>
    </EmptyState>

    <view class="safe-bottom" />
    <TriageTabbar active="sign" />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  padding: 32rpx;

  &__title {
    font-size: 40rpx;
    font-weight: 700;
    color: #1f2d3d;
  }

  &__desc {
    margin-top: 8rpx;
    font-size: 26rpx;
    color: #8a94a6;
  }
}

.safe-bottom {
  height: calc(120rpx + env(safe-area-inset-bottom));
}
</style>
