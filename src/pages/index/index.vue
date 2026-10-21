<script setup lang="ts">
import { onMounted, ref } from 'vue'

import type { CampusVo } from '@/api/appt/types'
import { listCampus } from '@/api/appt/public'
import { navigateTo, ROUTES } from '@/router/routes'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

const loading = ref(false)
const campuses = ref<CampusVo[]>([])
const errorText = ref('')

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    campuses.value = await listCampus()
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function goLogin() {
  navigateTo(ROUTES.login)
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <view class="hero__title">预约挂号</view>
      <view class="hero__desc">选择院区开始 · 演示数据全部虚构</view>
      <view v-if="!userStore.isLogin" class="hero__tip" @click="goLogin">未登录，点击去登录 ›</view>
    </view>

    <view v-if="loading" class="hint">加载中…</view>
    <view v-else-if="errorText" class="hint hint--error">
      {{ errorText }}
      <wd-button size="small" type="primary" plain custom-class="mt-2" @click="load">重试</wd-button>
    </view>

    <view v-else class="campus-list">
      <view v-for="item in campuses" :key="item.campusId" class="campus-card">
        <view class="campus-card__name">{{ item.name }}</view>
        <view class="campus-card__addr">{{ item.address || '地址待补充' }}</view>
      </view>
      <view v-if="!campuses.length" class="hint">暂无院区数据</view>
    </view>

    <view class="footnote">
      本页数据来自 <text class="mono">GET /appt/public/campus/list</text>（匿名可访问），
      用于验证 8084 → /dev-api → 8082 代理与请求封装。
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  padding: 32rpx 32rpx 60rpx;
}

.hero {
  padding: 40rpx 32rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #1f7a8c, #2a9d8f);
  color: #fff;

  &__title {
    font-size: 44rpx;
    font-weight: 700;
  }

  &__desc {
    margin-top: 12rpx;
    font-size: 26rpx;
    opacity: 0.9;
  }

  &__tip {
    margin-top: 24rpx;
    font-size: 26rpx;
    text-decoration: underline;
  }
}

.campus-list {
  margin-top: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.campus-card {
  padding: 28rpx 24rpx;
  border-radius: 20rpx;
  background: #fff;

  &__name {
    font-size: 32rpx;
    font-weight: 600;
    color: #1f2d3d;
  }

  &__addr {
    margin-top: 8rpx;
    font-size: 26rpx;
    color: #8a94a6;
  }
}

.hint {
  margin-top: 40rpx;
  text-align: center;
  font-size: 26rpx;
  color: #8a94a6;

  &--error {
    color: #d14343;
  }
}

.footnote {
  margin-top: 48rpx;
  font-size: 24rpx;
  color: #9aa4b2;
  line-height: 1.7;
}

.mono {
  font-family: monospace;
  color: #1f7a8c;
}
</style>
