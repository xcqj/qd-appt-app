<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { getCaptcha } from '@/api/appt/auth'
import type { CaptchaVo } from '@/api/appt/types'
import { ROUTES } from '@/router/routes'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

const form = reactive({
  username: '',
  password: '',
  code: '',
})

const captcha = ref<CaptchaVo | null>(null)
const loading = ref(false)
const errorText = ref('')

async function refreshCaptcha() {
  try {
    const data = await getCaptcha()
    captcha.value = data
    form.code = ''
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : '验证码加载失败'
  }
}

onMounted(refreshCaptcha)

async function submit() {
  if (!form.username || !form.password) {
    errorText.value = '请输入账号与密码'
    return
  }
  loading.value = true
  errorText.value = ''
  try {
    const mode = await userStore.login({
      username: form.username.trim(),
      password: form.password,
      code: form.code.trim(),
      uuid: captcha.value?.uuid || '',
    })
    if (mode === 'triage') {
      uni.reLaunch({ url: ROUTES.triageSign })
    } else if (getCurrentPages().length > 1) {
      // 从受保护页/未登录态叠进来的：回退到来源页，tabBar 与来源上下文都保留
      uni.navigateBack()
    } else {
      uni.switchTab({ url: ROUTES.home })
    }
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : '登录失败'
    await refreshCaptcha()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="login">
    <view class="login__title">登录</view>
    <view class="login__desc">演示账号：患者 admin / 分诊 appt_triage（密码 admin123）</view>

    <view class="field">
      <text class="field__label">账号</text>
      <input v-model="form.username" class="field__input" placeholder="请输入账号" />
    </view>

    <view class="field">
      <text class="field__label">密码</text>
      <input v-model="form.password" class="field__input" password placeholder="请输入密码" />
    </view>

    <view class="field">
      <text class="field__label">验证码</text>
      <input v-model="form.code" class="field__input field__input--short" placeholder="请输入验证码" />
      <image
        v-if="captcha?.captchaEnabled && captcha.img"
        class="captcha"
        :src="`data:image/png;base64,${captcha.img}`"
        mode="aspectFit"
        @click="refreshCaptcha"
      />
    </view>

    <view v-if="errorText" class="error">{{ errorText }}</view>

    <wd-button type="primary" block :loading="loading" custom-class="mt-3" @click="submit">
      登录
    </wd-button>
  </view>
</template>

<style lang="scss" scoped>
.login {
  padding: 60rpx 40rpx;

  &__title {
    font-size: 44rpx;
    font-weight: 700;
    color: #1f2d3d;
  }

  &__desc {
    margin-top: 12rpx;
    font-size: 24rpx;
    color: #8a94a6;
    line-height: 1.6;
  }
}

.field {
  display: flex;
  align-items: center;
  margin-top: 28rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;

  &__label {
    width: 120rpx;
    font-size: 28rpx;
    color: #4a5568;
  }

  &__input {
    flex: 1;
    font-size: 28rpx;

    &--short {
      flex: none;
      width: 220rpx;
    }
  }
}

.captcha {
  width: 180rpx;
  height: 72rpx;
  margin-left: 16rpx;
}

.error {
  margin-top: 20rpx;
  font-size: 26rpx;
  color: #d14343;
}
</style>
