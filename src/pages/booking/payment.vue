<script setup lang="ts">
/**
 * 9.8 支付（DESIGN §9.8）
 *
 * 端点：支付单由 B1 创建（`paymentNo / amount / expireTime` 从 query 带过来）；
 *       「立即支付」= C2 `mock-pay`（accepted 只表示受理）；状态 = C3 轮询；「取消」= B4。
 * 轮询：进入即查一次 → 每 2s 一次 → 60s 上限 → 两个出口；**离开页面必须停掉**。
 */
import { onHide, onLoad, onUnload } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import { cancelUnpaidPayment } from '@/api/appt/patient'
import { getPayment, mockPay } from '@/api/appt/payment'
import MoneyText from '@/components/MoneyText.vue'
import PageState from '@/components/PageState.vue'
import { navigateTo, reLaunch, ROUTES } from '@/router/routes'
import { useBookingStore } from '@/store/booking'
import { bizMessage, parseTimestamp, payStatusLabel } from '@/utils/appt'

const booking = useBookingStore()

type Phase = 'WAIT_PAY' | 'PAYING' | 'PAID' | 'CLOSED' | 'TIMEOUT'

const POLL_INTERVAL = 2000
const POLL_LIMIT = 60000

const paymentNo = ref('')
const amount = ref('0.00')
const expireTime = ref('')
const phase = ref<Phase>('WAIT_PAY')
const paying = ref(false)
const checking = ref(true)
const checkError = ref('')
/** 本轮轮询 60s 到点：给「继续等待 / 稍后在预约里查看」两个出口 */
const pollTimedOut = ref(false)

/** 倒计时只在进页面时算一次，避免每秒重算导致 `wd-count-down` 重置 */
const remainMs = ref(0)

let timer: ReturnType<typeof setTimeout> | null = null
let polling = false
let pollStartedAt = 0

const missingContext = computed(() => !paymentNo.value)
const isPaid = computed(() => phase.value === 'PAID')
const isClosed = computed(() => phase.value === 'CLOSED')

function stopPolling(): void {
  polling = false
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function applyStatus(status?: string): void {
  if (!status) {
    return
  }
  if (status === 'PAID' || status === 'REFUNDED') {
    stopPolling()
    phase.value = 'PAID'
    return
  }
  if (status === 'CLOSED') {
    stopPolling()
    phase.value = 'CLOSED'
  }
}

async function queryOnce(): Promise<void> {
  try {
    const payment = await getPayment(paymentNo.value)
    checkError.value = ''
    applyStatus(payment.status)
  } catch (e) {
    checkError.value = bizMessage(e)
  } finally {
    checking.value = false
  }
}

function scheduleNext(): void {
  timer = setTimeout(() => {
    void tick()
  }, POLL_INTERVAL)
}

async function tick(): Promise<void> {
  if (!polling) {
    return
  }
  await queryOnce()
  if (!polling) {
    return
  }
  if (Date.now() - pollStartedAt >= POLL_LIMIT) {
    stopPolling()
    pollTimedOut.value = true
    if (phase.value === 'PAYING') {
      phase.value = 'TIMEOUT'
    }
    return
  }
  scheduleNext()
}

/** 进入页面即开一轮（60s 上限）；`pay()` 只在已超时时重开一轮，避免无限续期 */
function startPolling(): void {
  stopPolling()
  pollTimedOut.value = false
  polling = true
  pollStartedAt = Date.now()
  scheduleNext()
}

async function pay(): Promise<void> {
  if (paying.value || isPaid.value || isClosed.value) {
    return
  }
  paying.value = true
  try {
    await mockPay(paymentNo.value, 'SUCCESS')
    phase.value = 'PAYING'
    if (!polling) {
      startPolling()
    }
  } catch (e) {
    uni.showToast({ title: bizMessage(e), icon: 'none' })
  } finally {
    paying.value = false
  }
}

function keepWaiting(): void {
  startPolling()
}

/** 支付成功 → 停在「已预约」；超时先看「待支付」。tab 页带不了 query，只能走 store 意图 */
function goAppointments(intent: 'BOOKED' | 'WAIT_PAY' = 'BOOKED'): void {
  booking.setListIntent(intent)
  reLaunch(ROUTES.registration)
}

function cancelBooking(): void {
  if (paying.value) {
    return
  }
  uni.showModal({
    title: '取消本次预约',
    content: '取消后号源立即释放，需要重新预约。',
    cancelText: '再想想',
    confirmText: '确认取消',
    success: (res) => {
      if (!res.confirm) {
        return
      }
      void doCancel()
    },
  })
}

async function doCancel(): Promise<void> {
  try {
    const result = await cancelUnpaidPayment(paymentNo.value)
    stopPolling()
    if (result.status === 'CLOSED') {
      phase.value = 'CLOSED'
      uni.showToast({ title: '预约已取消', icon: 'none' })
      return
    }
    // 服务端幂等直接回当前状态：已支付时不能显示「已取消」
    applyStatus(result.status)
    uni.showToast({ title: `该支付单${payStatusLabel(result.status)}，未取消预约`, icon: 'none' })
  } catch (e) {
    uni.showToast({ title: bizMessage(e), icon: 'none' })
  }
}

function goBooking(): void {
  navigateTo(ROUTES.campus)
}

onLoad((query) => {
  paymentNo.value = (query?.paymentNo as string) ?? ''
  amount.value = (query?.amount as string) ?? '0.00'
  expireTime.value = (query?.expireTime as string) ?? ''
  if (missingContext.value) {
    checking.value = false
    return
  }
  remainMs.value = Math.max(parseTimestamp(expireTime.value) - Date.now(), 0)
  // DESIGN §7：「进入即查一次 → 每 2s 轮询 → 60s 上限」；结果为终态时不再开轮询
  void queryOnce().then(() => {
    if (!isPaid.value && !isClosed.value) {
      startPolling()
    }
  })
})

onHide(() => {
  stopPolling()
})

onUnload(() => {
  stopPolling()
})
</script>

<template>
  <view class="appt-page payment">
    <view v-if="missingContext" class="appt-content payment__body">
      <PageState :empty="true" empty-text="支付单信息缺失" empty-desc="请从「我的预约」重新进入待支付订单" />
    </view>

    <PageState v-else :loading="checking" :error="checkError" :rows="2" @retry="queryOnce">
      <!-- 已支付 -->
      <view v-if="isPaid" class="appt-content payment__body">
        <view class="appt-card payment__result">
          <view class="payment__result-icon">✓</view>
          <text class="appt-section-title">支付成功</text>
          <text class="payment__result-text">支付成功，就诊当天请提前 15 分钟到院签到</text>
          <MoneyText :amount="amount" size="lg" />
          <view class="payment__result-action">
            <wd-button type="primary" block @click="goAppointments">查看预约</wd-button>
          </view>
        </view>
      </view>

      <!-- 已关闭 -->
      <view v-else-if="isClosed" class="appt-content payment__body">
        <view class="appt-card payment__result">
          <text class="appt-section-title">本次预约已关闭</text>
          <text class="payment__result-text">号源已释放；如仍需就诊，请重新选择医生与时间。</text>
          <view class="payment__result-action">
            <wd-button type="primary" block @click="goBooking">重新预约</wd-button>
          </view>
        </view>
      </view>

      <!-- 待支付 / 支付中 / 轮询超时 -->
      <view v-else class="payment__waiting">
        <view class="payment__amount">
          <MoneyText :amount="amount" size="lg" />
          <view class="payment__countdown">
            <text class="payment__countdown-label">剩余支付时间</text>
            <wd-count-down :time="remainMs" format="mm:ss" />
          </view>
        </view>

        <view class="appt-content">
          <view class="appt-card">
            <view class="appt-row">
              <text class="appt-text">支付方式</text>
              <view class="payment__way">
                <text class="payment__way-tag">演示</text>
                <text class="appt-sub">模拟支付</text>
              </view>
            </view>
            <view class="appt-row">
              <text class="appt-text">支付单号</text>
              <text class="appt-sub payment__no">{{ paymentNo }}</text>
            </view>
          </view>

          <view v-if="pollTimedOut" class="appt-card payment__timeout">
            <text class="appt-title">还没有收到支付结果</text>
            <text class="appt-weak payment__timeout-desc">可以先到「我的预约」查看状态，那里会持续更新。</text>
            <view class="payment__timeout-actions">
              <wd-button size="small" variant="plain" @click="keepWaiting">继续等待</wd-button>
              <wd-button size="small" type="primary" @click="goAppointments('WAIT_PAY')">稍后在预约里查看</wd-button>
            </view>
          </view>
        </view>

        <view class="appt-bottom-bar payment__bar">
          <wd-button type="primary" block :loading="paying || phase === 'PAYING'" :disabled="paying" @click="pay">
            {{ phase === 'PAYING' ? '正在确认支付结果' : '立即支付' }}
          </wd-button>
        </view>
        <view class="appt-bottom-placeholder" />
        <view class="payment__cancel">
          <text class="payment__cancel-link" @click="cancelBooking">取消本次预约</text>
        </view>
      </view>
    </PageState>
  </view>
</template>

<style lang="scss" scoped>
.payment {
  &__body {
    padding-top: 40rpx;
  }

  &__amount {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48rpx 0 24rpx;
    background-color: var(--appt-surface);
  }

  &__countdown {
    display: flex;
    align-items: center;
    margin-top: 16rpx;
    font-size: 24rpx;
    color: var(--appt-text-weak);
    font-variant-numeric: tabular-nums;
  }

  &__countdown-label {
    margin-right: 8rpx;
    font-size: 24rpx;
    color: var(--appt-text-weak);
  }

  &__way {
    display: flex;
    align-items: center;
  }

  &__way-tag {
    margin-right: 12rpx;
    padding: 2rpx 12rpx;
    border-radius: 8rpx;
    background-color: var(--appt-surface-weak);
    font-size: 22rpx;
    color: var(--appt-text-sub);
  }

  &__no {
    font-variant-numeric: tabular-nums;
  }

  &__timeout {
    margin-top: 20rpx;
  }

  &__timeout-desc {
    display: block;
    margin-top: 12rpx;
  }

  &__timeout-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 24rpx;
  }

  &__bar {
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  }

  &__cancel {
    padding: 8rpx 0 40rpx;
    text-align: center;
  }

  &__cancel-link {
    font-size: 26rpx;
    color: var(--appt-danger);
  }

  &__result {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48rpx 28rpx;
  }

  &__result-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 96rpx;
    height: 96rpx;
    margin-bottom: 24rpx;
    border-radius: 999rpx;
    background-color: rgba(46, 158, 107, 0.12);
    font-size: 48rpx;
    color: var(--appt-success);
  }

  &__result-text {
    margin: 12rpx 0 24rpx;
    font-size: 26rpx;
    line-height: 1.6;
    color: var(--appt-text-weak);
    text-align: center;
  }

  &__result-action {
    width: 100%;
    margin-top: 32rpx;
  }
}
</style>
