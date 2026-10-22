<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'

import { clearUnreadBadge } from '@/composables/useUnreadBadge'
import { navigateTo, ROUTES, switchTab } from '@/router/routes'
import { useBookingStore } from '@/store/booking'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const booking = useBookingStore()

function goLogin() {
  navigateTo(ROUTES.login)
}

function toTriage() {
  uni.reLaunch({ url: ROUTES.triageSign })
}

function toPatient() {
  switchTab(ROUTES.home)
}

function toPatients() {
  navigateTo(ROUTES.patientList)
}

function toFavorites() {
  navigateTo(ROUTES.favoriteList)
}

function toRegistration() {
  switchTab(ROUTES.registration)
}

function toNotice() {
  switchTab(ROUTES.notice)
}

async function handleLogout() {
  await userStore.logout()
  // 退出时清掉挂号上下文与未读角标，避免换账号后串号
  booking.reset()
  clearUnreadBadge()
  uni.reLaunch({ url: ROUTES.login })
}

onShow(() => {
  if (!userStore.isLogin) {
    clearUnreadBadge()
  }
})
</script>

<template>
  <view class="mine">
    <view class="profile">
      <view class="profile__avatar">{{ userStore.displayName.slice(0, 1) }}</view>
      <view class="profile__info">
        <view class="profile__name">{{ userStore.displayName }}</view>
        <view class="profile__roles">
          {{ userStore.isLogin ? userStore.roles.join(' / ') || '无角色' : '未登录' }}
        </view>
      </view>
      <wd-button v-if="!userStore.isLogin" size="small" type="primary" @click="goLogin">登录</wd-button>
    </view>

    <view class="cells">
      <view v-if="userStore.isLogin" class="cell" @click="toPatients">
        <text>我的就诊人</text>
        <text class="cell__arrow">›</text>
      </view>
      <view v-if="userStore.isLogin" class="cell" @click="toFavorites">
        <text>我的医生</text>
        <text class="cell__arrow">›</text>
      </view>
      <view v-if="userStore.isLogin" class="cell" @click="toRegistration">
        <text>我的预约</text>
        <text class="cell__arrow">›</text>
      </view>
      <view v-if="userStore.isLogin" class="cell" @click="toNotice">
        <text>消息</text>
        <text class="cell__arrow">›</text>
      </view>
      <view v-if="userStore.isTriage" class="cell" @click="toTriage">
        <text>切换到分诊台</text>
        <text class="cell__arrow">›</text>
      </view>
      <view v-if="userStore.isTriage" class="cell" @click="toPatient">
        <text>返回患者端</text>
        <text class="cell__arrow">›</text>
      </view>
      <view v-if="userStore.isLogin" class="cell cell--danger" @click="handleLogout">
        <text>退出登录</text>
        <text class="cell__arrow">›</text>
      </view>
    </view>

    <view class="footnote">
      演示项目：数据全部虚构，支付走模拟渠道，不提供真实医疗服务。
    </view>
  </view>
</template>

<style lang="scss" scoped>
.mine {
  padding: 32rpx;
}

.profile {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx 28rpx;
  background: #fff;
  border-radius: 20rpx;

  &__avatar {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background: #1f7a8c;
    color: #fff;
    font-size: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__info {
    flex: 1;
  }

  &__name {
    font-size: 32rpx;
    font-weight: 600;
  }

  &__roles {
    margin-top: 6rpx;
    font-size: 24rpx;
    color: #8a94a6;
  }
}

.cells {
  margin-top: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx 28rpx;
  font-size: 28rpx;
  border-bottom: 1rpx solid #f0f3f7;

  &:last-child {
    border-bottom: none;
  }

  &__arrow {
    color: #c4ccd8;
  }

  &--danger {
    color: #d14343;
  }
}

.footnote {
  margin-top: 32rpx;
  font-size: 24rpx;
  color: #9aa4b2;
  line-height: 1.7;
}
</style>
