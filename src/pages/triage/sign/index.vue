<script setup lang="ts">
/**
 * 分诊签到（S11 · 契约 §7.1–§7.2）
 *
 * 小程序：`uni.scanCode` 取就诊码（= `registrationNo`）走 E1 扫码签到；
 * H5：无扫码能力 → 手输单号走 E2 手动补签（页面明示，不让用户找不到入口）。
 * 硬约束：请求**不带 `campusId`**（服务端按账号解析，红线 10）；签到窗口由服务端判定。
 */
import { ref } from 'vue'

import type { SignResultVo } from '@/api/appt/types'
import { signByScan, signManually } from '@/api/appt/triage'
import TriageTabbar from '@/components/TriageTabbar.vue'
import { ROUTES } from '@/router/routes'
import { useUserStore } from '@/store/user'
import { bizMessage, shortDateTime, signTypeLabel, visitTimeText } from '@/utils/appt'

const userStore = useUserStore()

const registrationNo = ref('')
const submitting = ref(false)
const errorText = ref('')
const result = ref<SignResultVo | null>(null)

/**
 * 仅小程序有扫码能力（H5 没有可用的 `uni.scanCode`）
 *
 * 用「先置 false、MP 分支再改 true」而不是三元 + 双 return：
 * 条件编译在 H5 构建里会剥掉 MP 分支，双 return 会留下 unreachable 代码（oxlint 报警）。
 */
const canScan = ref(false)
// #ifdef MP
canScan.value = true
// #endif

function normalize(text: string): string {
  return text.trim()
}

async function submitManual(): Promise<void> {
  const no = normalize(registrationNo.value)
  if (!no) {
    errorText.value = '请输入就诊码（预约单号）'
    return
  }
  if (submitting.value) {
    return
  }
  submitting.value = true
  errorText.value = ''
  try {
    result.value = await signManually({ registrationNo: no })
    registrationNo.value = ''
    uni.showToast({ title: '签到成功', icon: 'none' })
  } catch (e) {
    errorText.value = bizMessage(e)
  } finally {
    submitting.value = false
  }
}

function scan(): void {
  if (submitting.value) {
    return
  }
  uni.scanCode({
    scanType: ['qrCode'],
    success: (res) => {
      const no = normalize(res.result || '')
      if (!no) {
        errorText.value = '未识别到就诊码，请改用手动补签'
        return
      }
      errorText.value = ''
      submitting.value = true
      signByScan({ registrationNo: no })
        .then((data) => {
          result.value = data
          uni.showToast({ title: '签到成功', icon: 'none' })
        })
        .catch((e: unknown) => {
          errorText.value = bizMessage(e)
        })
        .finally(() => {
          submitting.value = false
        })
    },
    fail: () => {
      errorText.value = '已取消扫码，可使用手动补签'
    },
  })
}

function backToPatient(): void {
  uni.switchTab({ url: ROUTES.home })
}
</script>

<template>
  <view class="appt-page sign">
    <view class="appt-content sign__body">
      <view class="appt-card sign__head">
        <text class="appt-section-title">分诊签到</text>
        <text class="appt-weak">当前账号：{{ userStore.displayName }}</text>
        <text v-if="!canScan" class="appt-weak sign__hint">H5 无扫码能力，请让患者出示就诊码后在此手动补签。</text>
      </view>

      <view class="appt-card sign__form">
        <text class="appt-text">就诊码（预约单号）</text>
        <view class="sign__input-row">
          <view class="sign__input">
            <wd-input v-model="registrationNo" placeholder="例如 R20261023000001" />
          </view>
          <text v-if="canScan" class="sign__scan" @click="scan">扫一扫</text>
        </view>
        <text v-if="errorText" class="sign__error">{{ errorText }}</text>
        <view class="sign__submit">
          <wd-button type="primary" block :loading="submitting" :disabled="submitting" @click="submitManual">
            手动补签
          </wd-button>
        </view>
      </view>

      <view v-if="result" class="appt-card sign__result">
        <text class="appt-section-title">签到成功</text>
        <view class="appt-row">
          <text class="appt-sub">就诊人</text>
          <text class="appt-text">{{ result.patientName }}</text>
        </view>
        <view class="appt-row">
          <text class="appt-sub">就诊医生</text>
          <text class="appt-text">{{ result.staffName }}</text>
        </view>
        <view class="appt-row">
          <text class="appt-sub">就诊时间</text>
          <text class="appt-text">{{ visitTimeText(result.visitDate, result.period, result.timePoint) }}</text>
        </view>
        <view class="appt-row">
          <text class="appt-sub">签到时间</text>
          <text class="appt-text">{{ shortDateTime(result.signTime) }}</text>
        </view>
        <view class="appt-row">
          <text class="appt-sub">签到方式</text>
          <text class="appt-text">{{ signTypeLabel(result.signType) }}</text>
        </view>
        <view class="appt-row">
          <text class="appt-sub">预约单号</text>
          <text class="appt-text sign__mono">{{ result.registrationNo }}</text>
        </view>
      </view>

      <view class="sign__footer">
        <text class="appt-link" @click="backToPatient">返回患者端 ›</text>
      </view>
      <text class="appt-weak sign__footnote">
        签到窗口：就诊日 00:00 起至就诊时刻后 30 分钟；已爽约的单不可补签。
      </text>
    </view>

    <view class="sign__tabbar-gap" />
    <TriageTabbar active="sign" />
  </view>
</template>

<style lang="scss" scoped>
.sign {
  &__body {
    padding-top: 24rpx;
  }

  &__head {
    display: flex;
    flex-direction: column;
  }

  &__hint {
    margin-top: 8rpx;
  }

  &__form {
    margin-top: 20rpx;
  }

  &__input-row {
    display: flex;
    align-items: center;
    margin-top: 16rpx;
  }

  &__input {
    flex: 1;
    padding: 8rpx 20rpx;
    border-radius: 16rpx;
    background-color: var(--appt-surface-weak);
  }

  &__scan {
    flex: none;
    margin-left: 20rpx;
    font-size: 26rpx;
    color: var(--appt-primary);
  }

  &__error {
    display: block;
    margin-top: 16rpx;
    font-size: 24rpx;
    color: var(--appt-danger);
  }

  &__submit {
    margin-top: 28rpx;
  }

  &__result {
    margin-top: 20rpx;
  }

  &__mono {
    font-variant-numeric: tabular-nums;
  }

  &__footer {
    padding: 32rpx 0 8rpx;
    text-align: center;
  }

  &__footnote {
    display: block;
    text-align: center;
  }

  &__tabbar-gap {
    height: calc(120rpx + env(safe-area-inset-bottom));
  }
}
</style>
