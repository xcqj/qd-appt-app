<script setup lang="ts">
/**
 * 9.11 我的（DESIGN §9.11）
 *
 * 结构：头像块 → 账户组（就诊人 / 医生 / 预约 / 消息）→ 角色组（仅 triage）→ 退出登录（独立卡 + 二次确认）→ 页脚声明。
 * 未登录时账户组与退出登录整块不渲染（不留空壳）。
 */
import { onShow } from '@dcloudio/uni-app'
import { computed } from 'vue'

import { clearUnreadBadge } from '@/composables/useUnreadBadge'
import { navigateTo, ROUTES, switchTab } from '@/router/routes'
import { useBookingStore } from '@/store/booking'
import { useUserStore } from '@/store/user'

interface MineEntry {
  label: string
  act: () => void
}

const userStore = useUserStore()
const booking = useBookingStore()

const roleText = computed(() => {
  if (!userStore.isLogin) {
    return '登录后可查看预约与消息'
  }
  return userStore.roles.join(' / ') || '无角色'
})

const accountEntries = computed<MineEntry[]>(() => [
  { label: '我的就诊人', act: () => navigateTo(ROUTES.patientList) },
  { label: '我的医生', act: () => navigateTo(ROUTES.favoriteList) },
  { label: '我的预约', act: () => switchTab(ROUTES.registration) },
  { label: '消息', act: () => switchTab(ROUTES.notice) },
])

const triageEntries: MineEntry[] = [
  { label: '切换到分诊台', act: () => uni.reLaunch({ url: ROUTES.triageSign }) },
  { label: '返回患者端', act: () => switchTab(ROUTES.home) },
]

function goLogin(): void {
  navigateTo(ROUTES.login)
}

async function handleLogout(): Promise<void> {
  await userStore.logout()
  // 退出时清掉挂号上下文与未读角标，避免换账号后串号
  booking.reset()
  clearUnreadBadge()
  // 回首页（tab 页）而不是登录页：底栏保留，用户想登录再点页内入口
  switchTab(ROUTES.home)
}

/** 危险操作二次确认（DESIGN §5 #12、§9.11） */
function confirmLogout(): void {
  uni.showModal({
    title: '退出登录',
    content: '退出后需重新登录才能查看预约记录与消息。',
    cancelText: '取消',
    confirmText: '退出登录',
    success: (res) => {
      if (res.confirm) {
        void handleLogout()
      }
    },
  })
}

onShow(() => {
  if (!userStore.isLogin) {
    clearUnreadBadge()
  }
})
</script>

<template>
  <view class="appt-page mine">
    <view class="appt-card mine__profile">
      <view class="mine__avatar">{{ userStore.isLogin ? userStore.displayName.slice(0, 1) : '未' }}</view>
      <view class="mine__info">
        <text class="mine__name">{{ userStore.isLogin ? userStore.displayName : '未登录' }}</text>
        <text class="mine__role">{{ roleText }}</text>
      </view>
      <wd-button v-if="!userStore.isLogin" size="small" type="primary" @click="goLogin">登录</wd-button>
    </view>

    <view v-if="userStore.isLogin" class="mine__group">
      <view
        v-for="item in accountEntries"
        :key="item.label"
        class="mine__row appt-press"
        @click="item.act()"
      >
        <text class="mine__row-label">{{ item.label }}</text>
        <text class="mine__row-arrow">›</text>
      </view>
    </view>

    <view v-if="userStore.isTriage" class="mine__group">
      <view v-for="item in triageEntries" :key="item.label" class="mine__row appt-press" @click="item.act()">
        <text class="mine__row-label">{{ item.label }}</text>
        <text class="mine__row-arrow">›</text>
      </view>
    </view>

    <view v-if="userStore.isLogin" class="mine__group">
      <view class="mine__row mine__row--danger appt-press" @click="confirmLogout">
        <text class="mine__row-label mine__row-label--danger">退出登录</text>
      </view>
    </view>

    <text class="mine__footnote">演示项目：数据全部虚构，支付走模拟渠道，不提供真实医疗服务。</text>
  </view>
</template>

<style lang="scss" scoped>
.mine {
  padding: 32rpx;

  &__profile {
    display: flex;
    align-items: center;
    gap: 24rpx;
  }

  &__avatar {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background-color: var(--appt-primary);
    color: #ffffff;
    font-size: 40rpx;
  }

  &__info {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  &__name {
    font-size: 32rpx;
    font-weight: 600;
    line-height: 1.4;
    color: var(--appt-text);
  }

  &__role {
    margin-top: 6rpx;
    font-size: 24rpx;
    line-height: 1.4;
    color: var(--appt-text-weak);
  }

  /* 组卡：白卡 24rpx 圆角 + 卡片档阴影；行内左右 28rpx 由容器给，行本身不重复 */
  &__group {
    margin-top: 20rpx;
    padding: 0 28rpx;
    border-radius: 24rpx;
    background-color: var(--appt-surface);
    box-shadow: var(--appt-shadow-card);
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    min-height: 96rpx;
    border-bottom: 1rpx solid var(--appt-line);

    &:last-child {
      border-bottom: none;
    }
  }

  &__row-label {
    font-size: 28rpx;
    line-height: 1.6;
    color: var(--appt-text);

    &--danger {
      color: var(--appt-danger);
    }
  }

  &__row-arrow {
    font-size: 32rpx;
    line-height: 1;
    color: var(--appt-text-weak);
  }

  &__row--danger {
    justify-content: center;
  }

  &__footnote {
    display: block;
    margin-top: 32rpx;
    font-size: 20rpx;
    line-height: 1.6;
    color: var(--appt-text-weak);
  }
}
</style>
