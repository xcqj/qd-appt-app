<script setup lang="ts">
import { ROUTES } from '@/router/routes'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

function goLogin() {
  uni.navigateTo({ url: ROUTES.login })
}

function toTriage() {
  uni.reLaunch({ url: ROUTES.triageSign })
}

function toPatient() {
  uni.switchTab({ url: ROUTES.home })
}

async function handleLogout() {
  await userStore.logout()
  uni.reLaunch({ url: ROUTES.login })
}
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
      骨架页：就诊人 / 我的医生 / 消息等业务页在 S11 实现；本页只验证登录态与双角色切换。
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
