<script setup lang="ts">
/**
 * 9.6A 排班页（DESIGN §9.6）
 *
 * 两种视角，取决于上下文：
 * - **医生视角**（从医生主页进来，`store.staff` 有值）：日期栏与午别余量用 A5 的 staffId 模式，
 *   列表只显示该医生——这才是「我点了他，就看他的号」的正常预约流程；
 * - **科室视角**（无医生上下文，或点了「查看本科室其他医生」）：日期栏与余量用 A5 的 deptId 聚合口径，
 *   列表显示本科室当日全部出诊医生。
 *
 * 字段：A5 `dates[]{visitDate, hasSchedule, periods[{period, remain, scheduleId}]}`、
 *       A6 `staffs[]{staffId, name, title, degree, periods[{period, remain, scheduleId}]}`。
 * 语汇：本屏**只**出现「有排班 / 无排班」，`remain = 0` 显示「无排班」而不是「满诊」（红线 6）。
 * scheduleId 只从 A6 的 periods 取，供 A7 使用（前端不自己拼）。
 */
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import type { DateVo, PeriodRemainVo, ScheduleStaffVo } from '@/api/appt/types'
import { getScheduleDates, getScheduleStaffs } from '@/api/appt/public'
import DateStrip from '@/components/DateStrip.vue'
import PageState from '@/components/PageState.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { navigateTo, ROUTES } from '@/router/routes'
import { useBookingStore } from '@/store/booking'
import { periodLabel, scheduleAvailability, titleLabel } from '@/utils/appt'

const booking = useBookingStore()
const deptId = ref('')
const selectedDate = ref('')
const selectedPeriod = ref('')
/** 医生视角下用户主动切到「本科室全部医生」 */
const showAllStaff = ref(false)

const focusStaffId = computed(() => booking.staff?.staffId ?? '')
const focused = computed(() => Boolean(focusStaffId.value) && !showAllStaff.value)

const {
  data: dates,
  loading: datesLoading,
  error: datesError,
  run: loadDates,
} = useAsyncData<DateVo[]>(
  () =>
    focused.value ? getScheduleDates({ staffId: focusStaffId.value }) : getScheduleDates({ deptId: deptId.value }),
  (list) => list.length === 0,
)

const {
  data: staffs,
  loading: staffsLoading,
  error: staffsError,
  run: loadStaffs,
} = useAsyncData<ScheduleStaffVo[]>(
  () => getScheduleStaffs({ deptId: deptId.value, date: selectedDate.value }),
  (list) => list.length === 0,
)

const loading = computed(() => datesLoading.value || staffsLoading.value)
const error = computed(() => datesError.value || staffsError.value)

/** 当日午别与余量：医生视角 = 该医生各午别；科室视角 = 全部出诊人员求和 */
const dayPeriods = computed<PeriodRemainVo[]>(
  () => dates.value?.find((item) => item.visitDate === selectedDate.value)?.periods ?? [],
)

const periodOptions = computed(() =>
  dayPeriods.value.map((item) => ({
    ...item,
    label: `${periodLabel(item.period)} · 余 ${item.remain}`,
  })),
)

const rows = computed(() => {
  const list = staffs.value ?? []
  const source = focused.value ? list.filter((staff) => staff.staffId === focusStaffId.value) : list
  return source.map((staff) => {
    const matched = staff.periods.find((item) => item.period === selectedPeriod.value)
    const remain = matched ? matched.remain : 0
    return {
      staff,
      remain,
      scheduleId: matched?.scheduleId ?? '',
      label: matched ? scheduleAvailability(remain) : '无排班',
    }
  })
})

const hostName = computed(() =>
  focused.value && booking.staff ? `${booking.staff.name} · ${booking.dept?.name ?? ''}` : booking.dept?.name ?? '',
)

/** 选中午别始终落在「有号」上；全满则停在该午别并展示「无排班」 */
function syncPeriod(): void {
  const periods = dayPeriods.value
  if (!periods.length) {
    selectedPeriod.value = ''
    return
  }
  const keep = periods.find((item) => item.period === selectedPeriod.value && item.remain > 0)
  if (keep) {
    return
  }
  const firstOpen = periods.find((item) => item.remain > 0)
  selectedPeriod.value = firstOpen ? firstOpen.period : periods[0].period
}

function pickDate(visitDate: string): void {
  if (visitDate === selectedDate.value) {
    return
  }
  selectedDate.value = visitDate
  syncPeriod()
  void loadStaffs()
}

function pickPeriod(period: string): void {
  selectedPeriod.value = period
}

function openSlots(row: { staff: ScheduleStaffVo; remain: number; scheduleId: string }): void {
  if (row.remain <= 0 || !row.scheduleId) {
    return
  }
  booking.setStaff({ staffId: row.staff.staffId, name: row.staff.name, title: row.staff.title })
  booking.selectDay(selectedDate.value, selectedPeriod.value, row.scheduleId)
  navigateTo(ROUTES.slots)
}

async function reload(): Promise<void> {
  await loadDates()
  const keep = dates.value?.some((item) => item.visitDate === selectedDate.value && item.hasSchedule)
  if (!keep) {
    const first = dates.value?.find((item) => item.hasSchedule) ?? dates.value?.[0]
    selectedDate.value = first?.visitDate ?? ''
  }
  syncPeriod()
  void loadStaffs()
}

/** 医生视角 ↔ 科室视角：日期栏口径要从 staffId 切回 deptId（或反向），必须重拉 A5 */
function toggleScope(): void {
  showAllStaff.value = !showAllStaff.value
  void reload()
}

onLoad(() => {
  deptId.value = booking.dept?.deptId ?? ''
  if (!deptId.value) {
    return
  }
  void reload()
})
</script>

<template>
  <view class="appt-page schedule">
    <view v-if="!deptId" class="appt-content schedule__body">
      <PageState :empty="true" empty-text="还没有选择科室" empty-desc="从科室列表进入，才能看到该科室的排班" />
    </view>

    <template v-else>
      <view class="schedule__head">
        <text class="appt-title">{{ hostName }}</text>
        <text class="appt-weak">{{ booking.campus?.name }}</text>
      </view>

      <PageState
        :loading="loading"
        :error="error"
        :empty="!loading && !error && rows.length === 0"
        empty-text="当日暂无排班"
        empty-desc="换一个日期看看，或查看本科室其他医生"
        :rows="4"
        @retry="reload"
      >
        <view class="appt-content">
          <DateStrip
            v-if="(dates || []).length"
            :dates="dates || []"
            :model-value="selectedDate"
            @update:model-value="pickDate"
          />

          <view v-if="periodOptions.length" class="schedule__periods">
            <view
              v-for="item in periodOptions"
              :key="item.period"
              class="schedule__period"
              :class="{
                'schedule__period--active': item.period === selectedPeriod,
                'schedule__period--off': item.remain <= 0,
              }"
              @click="pickPeriod(item.period)"
            >
              {{ item.label }}
            </view>
          </view>

          <view class="appt-card schedule__list">
            <view
              v-for="row in rows"
              :key="row.staff.staffId"
              class="schedule__row appt-press"
              :class="{ 'schedule__row--off': row.remain <= 0 }"
              @click="openSlots(row)"
            >
              <view class="schedule__row-main">
                <text class="schedule__name">{{ row.staff.name }}</text>
                <text class="appt-weak">{{ titleLabel(row.staff.title) }}</text>
              </view>
              <text class="schedule__state" :class="{ 'schedule__state--on': row.remain > 0 }">{{ row.label }}</text>
            </view>
          </view>

          <view v-if="focusStaffId" class="schedule__scope">
            <text class="appt-link" @click="toggleScope">
              {{ focused ? '查看本科室其他医生排班 ›' : '只看该医生 ›' }}
            </text>
          </view>
        </view>
      </PageState>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.schedule {
  &__body {
    padding-top: 32rpx;
  }

  &__head {
    display: flex;
    flex-direction: column;
    padding: 24rpx 32rpx 12rpx;
  }

  &__periods {
    display: flex;
    margin: 20rpx 0;
    padding: 6rpx;
    border-radius: 16rpx;
    background-color: var(--appt-surface-weak);
  }

  &__period {
    flex: 1;
    padding: 14rpx 0;
    border-radius: 12rpx;
    font-size: 26rpx;
    color: var(--appt-text-sub);
    text-align: center;

    &--active {
      background-color: var(--appt-surface);
      font-weight: 600;
      color: var(--appt-primary);
    }

    &--off {
      color: var(--appt-text-weak);
    }
  }

  &__list {
    padding: 0 28rpx;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    min-height: 112rpx;
    padding: 16rpx 0;
    border-bottom: 1rpx solid var(--appt-line);

    &:last-child {
      border-bottom: none;
    }

    &--off {
      opacity: 0.72;
    }
  }

  &__row-main {
    display: flex;
    flex-direction: column;
  }

  &__name {
    font-size: 32rpx;
    font-weight: 600;
    color: var(--appt-text);
  }

  &__state {
    font-size: 24rpx;
    color: var(--appt-text-weak);

    &--on {
      color: var(--appt-success);
    }
  }

  &__scope {
    padding: 28rpx 0 8rpx;
    text-align: center;
  }
}
</style>
