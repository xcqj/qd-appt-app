<script setup lang="ts">
/**
 * 9.6B 选时间点（DESIGN §9.6）
 *
 * 字段：A7 `slotId / timePoint / fee`（**只返回可约号源**，`TAKEN` 不出现，契约 §3.7）。
 * 入参：`scheduleId` 取自 A6 `periods[].scheduleId`（store 里已存），`period` 取当前午别上下文。
 * 栈纪律：本页 → 确认预约用 redirectTo 收敛，不在栈里堆 4 层。
 */
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import type { SlotVo } from '@/api/appt/types'
import { listSlots } from '@/api/appt/public'
import MoneyText from '@/components/MoneyText.vue'
import PageState from '@/components/PageState.vue'
import SlotGrid from '@/components/SlotGrid.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { navigateBack, navigateTo, redirectTo, ROUTES } from '@/router/routes'
import { useBookingStore } from '@/store/booking'
import { useUserStore } from '@/store/user'
import { periodLabel, timePointText, visitTimeText } from '@/utils/appt'

const booking = useBookingStore()
const userStore = useUserStore()

const selected = ref<SlotVo | null>(null)

const { data: slots, loading, error, isEmpty, run } = useAsyncData<SlotVo[]>(
  () =>
    listSlots({
      scheduleId: booking.scheduleId,
      period: booking.period,
    }),
  (list) => list.length === 0,
)

const summary = computed(() =>
  [booking.staff?.name, visitTimeText(booking.visitDate, booking.period, '')]
    .filter(Boolean)
    .join(' · ')
    .trim(),
)

const missingContext = computed(() => !booking.scheduleId || !booking.period || !booking.visitDate)

function pick(slot: SlotVo): void {
  selected.value = slot
}

function next(): void {
  const slot = selected.value
  if (!slot) {
    return
  }
  booking.setSlot({
    slotId: slot.slotId,
    timePoint: slot.timePoint,
    fee: slot.fee,
    scheduleId: booking.scheduleId,
  })
  if (!userStore.isLogin) {
    navigateTo(ROUTES.login)
    return
  }
  redirectTo(ROUTES.bookingConfirm)
}

function changePeriod(): void {
  navigateBack()
}

onLoad(() => {
  if (missingContext.value) {
    return
  }
  void run()
})
</script>

<template>
  <view class="appt-page slots">
    <view class="appt-content slots__body">
      <view v-if="missingContext" class="slots__panel">
        <PageState
          :empty="true"
          empty-text="还没有选择排班"
          empty-desc="请从排班页选择医生与午别后再选时间"
        >
          <template #empty-action>
            <wd-button size="small" type="primary" @click="changePeriod">返回排班</wd-button>
          </template>
        </PageState>
      </view>

      <template v-else>
        <view class="slots__summary">
          <text class="slots__summary-title">{{ summary }}</text>
          <text class="appt-weak">{{ periodLabel(booking.period) }}号源，选中后 15 分钟内完成支付</text>
        </view>

        <PageState
          :loading="loading"
          :error="error"
          :empty="isEmpty"
          empty-text="该午别号源已约满"
          empty-desc="换一个午别或日期试试"
          :rows="3"
          @retry="run"
        >
          <template #empty-action>
            <wd-button size="small" variant="plain" type="primary" @click="changePeriod">换上午 / 下午</wd-button>
          </template>

          <view class="appt-card slots__card">
            <SlotGrid :slots="slots || []" :model-value="selected?.slotId || ''" @update:model-value="pick" />
          </view>
        </PageState>
      </template>
    </view>

    <view v-if="!missingContext && !isEmpty" class="appt-bottom-bar slots__bar">
      <view class="slots__bar-info">
        <text class="appt-weak">{{ selected ? timePointText(selected.timePoint) : '请选择时间' }}</text>
        <MoneyText v-if="selected" :amount="selected.fee" size="sm" />
      </view>
      <view class="slots__bar-action">
        <wd-button type="primary" :disabled="!selected" @click="next">下一步</wd-button>
      </view>
    </view>
    <view v-if="!missingContext && !isEmpty" class="appt-bottom-placeholder" />
  </view>
</template>

<style lang="scss" scoped>
.slots {
  &__body {
    padding-top: 24rpx;
  }

  &__panel {
    padding-top: 40rpx;
  }

  &__summary {
    display: flex;
    flex-direction: column;
    margin-bottom: 20rpx;
  }

  &__summary-title {
    font-size: 32rpx;
    font-weight: 600;
    line-height: 1.4;
    color: var(--appt-text);
  }

  &__card {
    padding: 28rpx 28rpx 12rpx;
  }

  &__bar {
    justify-content: space-between;
  }

  &__bar-info {
    display: flex;
    flex-direction: column;
  }

  &__bar-action {
    flex: none;
    margin-left: 24rpx;
  }
}
</style>
