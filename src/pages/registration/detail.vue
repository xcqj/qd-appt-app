<script setup lang="ts">
/**
 * 9.10 预约详情（含就诊码）（DESIGN §9.10）
 *
 * 字段：B3 `registrationNo / status / settleStatus / cancelType / visitDate / period / timePoint /
 *       fee / signTime / visitCode / patient{name,idType,idNoMasked} / staff{name,title,deptName,campusName} /
 *       payment{...} / refund{...}`。
 * 硬约束：`visitCode` 仅在 `BOOKED / SIGNED / COMPLETED` 返回，**不得用 `registrationNo` 冒替**；
 * 退号仅 `BOOKED` 且未过「就诊前一日 23:00」，否则只展示原因。
 */
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import type { RegistrationDetailVo } from '@/api/appt/types'
import { cancelRegistration, getRegistrationDetail } from '@/api/appt/patient'
import MoneyText from '@/components/MoneyText.vue'
import PageState from '@/components/PageState.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { navigateTo, ROUTES } from '@/router/routes'
import {
  bizMessage,
  canShowVisitCode,
  cancelTypeLabel,
  idTypeLabel,
  refundDeadlineLabel,
  refundDeadlinePassed,
  refundStatusLabel,
  regStatusLabel,
  regStatusTone,
  shortDateTime,
  visitTimeText,
} from '@/utils/appt'

const registrationId = ref('')
const cancelling = ref(false)

const { data: detail, loading, error, run } = useAsyncData<RegistrationDetailVo>(() =>
  getRegistrationDetail(registrationId.value),
)

const status = computed(() => detail.value?.status ?? '')
const tone = computed(() => regStatusTone(status.value))

/** 状态头一句话（不编造时间，只给下一步） */
const statusHint = computed(() => {
  switch (status.value) {
    case 'WAIT_PAY':
      return '尚未支付，请在支付截止前完成支付'
    case 'BOOKED':
      return '就诊当天请提前 15 分钟到院签到'
    case 'SIGNED':
      return '已签到，请在候诊区等候叫号'
    case 'COMPLETED':
      return '本次就诊已完成'
    case 'CLOSED':
      return '该预约已关闭（取消或超时未支付）'
    case 'CANCELED_ACTIVE':
      return '已主动退号，号源已释放'
    case 'CANCELED_PASSIVE':
      return '因医生停诊已退号，费用原路退回'
    case 'NOSHOW':
      return '已记入爽约记录'
    default:
      return ''
  }
})

const codeVisible = computed(() => Boolean(detail.value?.visitCode) && canShowVisitCode(status.value))

const visitText = computed(() =>
  detail.value ? visitTimeText(detail.value.visitDate, detail.value.period, detail.value.timePoint) : '',
)

const infoRows = computed(() => {
  const item = detail.value
  if (!item) {
    return []
  }
  return [
    { label: '就诊医生', value: [item.staff?.name, item.staff?.title].filter(Boolean).join(' ') },
    { label: '就诊科室', value: item.staff?.deptName ?? '' },
    { label: '就诊院区', value: item.staff?.campusName ?? '' },
    { label: '就诊时间', value: visitText.value },
    { label: '就诊人', value: item.patient?.name ?? '' },
  ]
})

/** 退款信息只与「已退号」两个终态同屏（DESIGN §9.10 校准：状态头与退款块不得矛盾） */
const showRefund = computed(
  () => Boolean(detail.value?.refund) && ['CANCELED_ACTIVE', 'CANCELED_PASSIVE'].includes(status.value),
)

const canCancel = computed(() => {
  if (!detail.value || status.value !== 'BOOKED') {
    return false
  }
  return !refundDeadlinePassed(detail.value.visitDate)
})

const cancelTip = computed(() => {
  if (!detail.value) {
    return ''
  }
  const deadline = refundDeadlineLabel(detail.value.visitDate)
  if (status.value !== 'BOOKED') {
    return `当前状态（${regStatusLabel(status.value)}）不可退号`
  }
  if (refundDeadlinePassed(detail.value.visitDate)) {
    return `已过退号时限（${deadline}），如需处理请联系门诊服务台`
  }
  return `就诊前一日 23:00 前可退号（本次截止 ${deadline}）`
})

function goPay(): void {
  const payment = detail.value?.payment
  if (!payment?.paymentNo) {
    uni.showToast({ title: '该预约暂无支付单', icon: 'none' })
    return
  }
  navigateTo(ROUTES.bookingPayment, {
    paymentNo: payment.paymentNo,
    amount: payment.amount,
    expireTime: payment.expireTime,
  })
}

function confirmCancel(): void {
  if (!canCancel.value || cancelling.value) {
    return
  }
  uni.showModal({
    title: '确认退号',
    content: '退号后号源立即释放，已支付的费用将原路退回。',
    cancelText: '取消',
    confirmText: '确认退号',
    success: (res) => {
      if (res.confirm) {
        void doCancel()
      }
    },
  })
}

async function doCancel(): Promise<void> {
  cancelling.value = true
  try {
    const result = await cancelRegistration(registrationId.value)
    uni.showToast({
      title: result.refundNo ? '已退号，退款处理中' : '已退号',
      icon: 'none',
    })
    await run()
  } catch (e) {
    uni.showToast({ title: bizMessage(e), icon: 'none' })
  } finally {
    cancelling.value = false
  }
}

onLoad((query) => {
  registrationId.value = (query?.registrationId as string) ?? ''
  if (!registrationId.value) {
    return
  }
  void run()
})

/** 从支付页返回时刷新（状态可能已变） */
onShow(() => {
  if (registrationId.value && !loading.value) {
    void run()
  }
})
</script>

<template>
  <view class="appt-page detail">
    <view v-if="!registrationId" class="appt-content detail__body">
      <PageState :empty="true" empty-text="缺少预约编号" empty-desc="请从我的预约列表进入该预约" />
    </view>

    <PageState v-else :loading="loading" :error="error" :rows="3" @retry="run">
      <template v-if="detail">
        <!-- 状态头：状态色 12% 底 -->
        <view class="detail__banner" :class="`detail__banner--${tone}`">
          <view class="detail__banner-main">
            <text class="detail__banner-title">{{ regStatusLabel(detail.status) }}</text>
            <text v-if="detail.cancelType" class="detail__banner-sub">{{ cancelTypeLabel(detail.cancelType) }}</text>
          </view>
          <text class="detail__banner-hint">{{ statusHint }}</text>
        </view>

        <view class="appt-content detail__body">
          <!-- 就诊码 -->
          <view class="appt-card detail__code">
            <template v-if="codeVisible">
              <wd-qr-code :text="detail.visitCode || ''" :size="180" />
              <text class="detail__code-no">{{ detail.registrationNo }}</text>
              <text class="appt-weak">就诊当天向分诊台出示此码</text>
            </template>
            <template v-else>
              <text class="detail__code-off">本次就诊已结束</text>
              <text class="appt-weak">就诊码仅在「已预约 / 已签到 / 已完成」时显示</text>
              <text class="detail__code-no">{{ detail.registrationNo }}</text>
            </template>
          </view>

          <!-- 信息卡 -->
          <view class="appt-card">
            <view v-for="row in infoRows" :key="row.label" class="appt-row">
              <text class="appt-sub">{{ row.label }}</text>
              <text class="appt-text detail__value">{{ row.value || '—' }}</text>
            </view>
            <view class="appt-row">
              <text class="appt-sub">挂号费</text>
              <MoneyText :amount="detail.fee" size="sm" />
            </view>
            <view v-if="detail.patient" class="appt-row">
              <text class="appt-sub">证件类型</text>
              <text class="appt-text detail__value">{{ idTypeLabel(detail.patient.idType) }}</text>
            </view>
            <view v-if="detail.patient?.idNoMasked" class="appt-row">
              <text class="appt-sub">证件号</text>
              <text class="appt-text detail__value detail__value--num">{{ detail.patient.idNoMasked }}</text>
            </view>
            <view v-if="detail.signTime" class="appt-row">
              <text class="appt-sub">签到时间</text>
              <text class="appt-text detail__value">{{ shortDateTime(detail.signTime) }}</text>
            </view>
          </view>

          <!-- 退款块 -->
          <view v-if="showRefund && detail.refund" class="appt-card">
            <text class="appt-section-title">退款信息</text>
            <view class="appt-row">
              <text class="appt-sub">退款单号</text>
              <text class="appt-text detail__value">{{ detail.refund.refundNo }}</text>
            </view>
            <view class="appt-row">
              <text class="appt-sub">退款金额</text>
              <MoneyText :amount="detail.refund.amount" size="sm" />
            </view>
            <view class="appt-row">
              <text class="appt-sub">退款状态</text>
              <text class="appt-text detail__value">{{ refundStatusLabel(detail.refund.status) }}</text>
            </view>
          </view>

          <!-- 动作 -->
          <view class="detail__actions">
            <wd-button
              v-if="detail.status === 'WAIT_PAY'"
              type="primary"
              block
              @click="goPay"
            >
              去支付
            </wd-button>
            <template v-else>
              <text class="detail__cancel" :class="{ 'detail__cancel--off': !canCancel }" @click="confirmCancel">
                {{ cancelling ? '退号处理中…' : '退号' }}
              </text>
              <text class="appt-weak detail__cancel-tip">{{ cancelTip }}</text>
            </template>
          </view>
        </view>
      </template>
    </PageState>
  </view>
</template>

<style lang="scss" scoped>
.detail {
  &__banner {
    display: flex;
    flex-direction: column;
    padding: 32rpx;
    background-color: rgba(90, 102, 126, 0.1);

    &--warn {
      background-color: rgba(217, 142, 4, 0.12);
    }

    &--info {
      background-color: rgba(59, 130, 196, 0.12);
    }

    &--success {
      background-color: rgba(46, 158, 107, 0.12);
    }

    &--danger {
      background-color: rgba(209, 67, 67, 0.12);
    }
  }

  &__banner-main {
    display: flex;
    align-items: baseline;
  }

  &__banner-title {
    font-size: 40rpx;
    font-weight: 600;
    line-height: 1.3;
    color: var(--appt-text);
  }

  &__banner-sub {
    margin-left: 12rpx;
    font-size: 24rpx;
    color: var(--appt-text-sub);
  }

  &__banner-hint {
    margin-top: 8rpx;
    font-size: 26rpx;
    line-height: 1.5;
    color: var(--appt-text-sub);
  }

  &__body {
    padding-top: 24rpx;
  }

  &__code {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40rpx 28rpx;
  }

  &__code-no {
    margin: 20rpx 0 8rpx;
    font-size: 24rpx;
    letter-spacing: 1rpx;
    color: var(--appt-text);
    font-variant-numeric: tabular-nums;
  }

  &__code-off {
    font-size: 32rpx;
    font-weight: 600;
    color: var(--appt-text-sub);
    margin-bottom: 8rpx;
  }

  &__value {
    max-width: 460rpx;
    text-align: right;

    /* 证件号等脱敏串用等宽数字，避免逐行抖动 */
    &--num {
      font-variant-numeric: tabular-nums;
      letter-spacing: 1rpx;
    }
  }

  &__actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32rpx 0 48rpx;
  }

  &__cancel {
    font-size: 26rpx;
    color: var(--appt-danger);
    text-decoration: underline;

    &--off {
      color: var(--appt-text-weak);
      text-decoration: none;
    }
  }

  &__cancel-tip {
    margin-top: 12rpx;
    text-align: center;
  }
}
</style>
