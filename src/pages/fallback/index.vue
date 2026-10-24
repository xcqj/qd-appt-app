<script setup lang="ts">
/**
 * 兜底页（DESIGN §9.12 404 / §9.13 网络异常）
 *
 * 两个模式共用一套居中结构，只换标题、说明与动作：
 * - `notfound`：H5 路由未命中、业务层判定「数据不存在」时进入，出口是「返回首页」；
 * - `offline` ：首屏接口不可达时进入，出口是「重新加载」。
 *
 * 结构：母标纯十字档水印（主色 20%）→ 标题 → 一句说明（给下一步）→ 主按钮 → 文字链。
 * 不套卡片、不做插画、不出现错误码。
 */
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import { ROUTES, navigateBack, reLaunch, switchTab } from '@/router/routes'

type FallbackMode = 'notfound' | 'offline'

const mode = ref<FallbackMode>('notfound')

const view = computed(() =>
  mode.value === 'offline'
    ? {
        navTitle: '网络异常',
        title: '网络不可用',
        desc: '请检查网络连接后重试，或稍后再打开此页面',
        primary: '重新加载',
      }
    : {
        navTitle: '页面不存在',
        title: '页面不存在',
        desc: '该页面可能已下线，或链接地址有误',
        primary: '返回首页',
      },
)

/** 主按钮：offline 重新拉首屏（reLaunch 清栈），notfound 回首页（tab 跳转） */
function onPrimary(): void {
  if (mode.value === 'offline') {
    reLaunch(ROUTES.home)
    return
  }
  switchTab(ROUTES.home)
}

/** 文字链：offline 回首页，notfound 优先回上一页（无栈可退时回首页） */
function onSecondary(): void {
  if (mode.value === 'notfound' && getCurrentPages().length > 1) {
    navigateBack()
    return
  }
  switchTab(ROUTES.home)
}

onLoad((query) => {
  mode.value = query?.mode === 'offline' ? 'offline' : 'notfound'
  uni.setNavigationBarTitle({ title: view.value.navTitle })
})
</script>

<template>
  <view class="appt-page fallback">
    <image class="fallback__mark" src="/static/brand/logo-cross-128.png" mode="aspectFit" />
    <text class="fallback__title">{{ view.title }}</text>
    <text class="fallback__desc">{{ view.desc }}</text>
    <view class="fallback__primary">
      <wd-button type="primary" block @click="onPrimary">{{ view.primary }}</wd-button>
    </view>
    <text class="fallback__link" @click="onSecondary">
      {{ mode === 'offline' ? '返回首页' : '返回上一页' }}
    </text>
  </view>
</template>

<style lang="scss" scoped>
.fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: 100vh;
  padding: 0 64rpx 120rpx;

  /* 母标纯十字档作水印：主色 20%，不加牌（DESIGN §12.2 三档规则） */
  &__mark {
    width: 96rpx;
    height: 96rpx;
    opacity: 0.2;
  }

  &__title {
    margin-top: 24rpx;
    font-size: 44rpx;
    font-weight: 600;
    line-height: 1.3;
    color: var(--appt-text);
  }

  &__desc {
    margin-top: 16rpx;
    font-size: 26rpx;
    line-height: 1.5;
    color: var(--appt-text-sub);
    text-align: center;
  }

  &__primary {
    width: 320rpx;
    margin-top: 40rpx;
  }

  &__link {
    margin-top: 24rpx;
    font-size: 26rpx;
    line-height: 1.5;
    color: var(--appt-primary);
  }
}
</style>
