<script setup lang="ts">
/**
 * 当日签到列表（S11 · 契约 §7.3）
 *
 * 字段：E3 `registrationNo / patientName / staffName / deptName / campusName / visitDate / period /
 *       timePoint / status / signTime / signType`（排序：院区 → 科室 → 时刻 → id，故按院区分组）。
 * 硬约束：**请求不带 `campusId`**（数据范围服务端按账号解析）；`timePoint` 是完整时间戳 → `timePointText()` 归一。
 * 行内「补签」走 E2（`registrationId`），已爽约不可补签（服务端权威）。
 */
import { computed, ref } from 'vue'
import { onReachBottom, onShow } from '@dcloudio/uni-app'

import type { SignListVo } from '@/api/appt/types'
import { listSignRecords, signManually } from '@/api/appt/triage'
import PageState from '@/components/PageState.vue'
import StatusTag from '@/components/StatusTag.vue'
import TriageTabbar from '@/components/TriageTabbar.vue'
import { bizMessage, dayNumber, periodLabel, shortDateTime, signTypeLabel, timePointText, weekdayLabel } from '@/utils/appt'

const PAGE_SIZE = 20

const selectedDate = ref(todayText())
const rows = ref<SignListVo[]>([])
const total = ref(0)
const pageNum = ref(1)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')
const signingId = ref('')

/** 前后各 3 天，便于分诊台补录昨天 / 预览明天 */
const dateOptions = computed(() => {
  const base = new Date(`${todayText()}T00:00:00`)
  const list: string[] = []
  for (let offset = -3; offset <= 3; offset += 1) {
    const date = new Date(base)
    date.setDate(base.getDate() + offset)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    list.push(`${date.getFullYear()}-${month}-${day}`)
  }
  return list
})

/** 按院区分组（服务端已按院区 → 科室 → 时刻排序，这里只做视觉分组） */
const groups = computed(() => {
  const map = new Map<string, SignListVo[]>()
  rows.value.forEach((row) => {
    const key = row.campusName || '未分配院区'
    const bucket = map.get(key)
    if (bucket) {
      bucket.push(row)
    } else {
      map.set(key, [row])
    }
  })
  return Array.from(map, ([campusName, items]) => ({ campusName, items }))
})

const isEmpty = computed(() => !loading.value && !error.value && rows.value.length === 0)
const finished = computed(() => rows.value.length >= total.value)

function todayText(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

async function load(reset: boolean): Promise<void> {
  if (reset) {
    pageNum.value = 1
    loading.value = true
    error.value = ''
  } else {
    loadingMore.value = true
  }
  try {
    const page = await listSignRecords({
      date: selectedDate.value,
      pageNum: pageNum.value,
      pageSize: PAGE_SIZE,
    })
    rows.value = reset ? page.rows : [...rows.value, ...page.rows]
    total.value = page.total
  } catch (e) {
    error.value = bizMessage(e)
    if (reset) {
      rows.value = []
      total.value = 0
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function pickDate(date: string): void {
  if (date === selectedDate.value) {
    return
  }
  selectedDate.value = date
  void load(true)
}

async function doSign(row: SignListVo): Promise<void> {
  if (signingId.value) {
    return
  }
  signingId.value = row.registrationId
  try {
    await signManually({ registrationId: row.registrationId })
    uni.showToast({ title: '补签成功', icon: 'none' })
    await load(true)
  } catch (e) {
    uni.showToast({ title: bizMessage(e), icon: 'none' })
  } finally {
    signingId.value = ''
  }
}

onShow(() => {
  void load(true)
})

onReachBottom(() => {
  if (loading.value || loadingMore.value || finished.value) {
    return
  }
  pageNum.value += 1
  void load(false)
})
</script>

<template>
  <view class="appt-page triage-list">
    <view class="triage-list__dates">
      <view
        v-for="date in dateOptions"
        :key="date"
        class="triage-list__date"
        :class="{ 'triage-list__date--active': date === selectedDate }"
        @click="pickDate(date)"
      >
        <text class="triage-list__week">{{ weekdayLabel(date) }}</text>
        <text class="triage-list__day">{{ dayNumber(date) }}</text>
      </view>
    </view>

    <view class="appt-content triage-list__body">
      <PageState
        :loading="loading"
        :error="error"
        :empty="isEmpty"
        empty-text="当天暂无预约记录"
        empty-desc="请选择其他日期，或请患者出示就诊码至签到页补签"
        :rows="4"
        @retry="load(true)"
      >
        <view v-for="group in groups" :key="group.campusName" class="triage-list__group">
          <text class="triage-list__group-title">{{ group.campusName }}</text>
          <view class="appt-card triage-list__card">
            <view v-for="row in group.items" :key="row.registrationId" class="triage-list__row">
              <view class="triage-list__main">
                <view class="triage-list__line">
                  <text class="triage-list__patient">{{ row.patientName }}</text>
                  <StatusTag :status="row.status" />
                </view>
                <text class="appt-weak">
                  {{ row.staffName }} · {{ row.deptName }} · {{ periodLabel(row.period) }}
                  {{ timePointText(row.timePoint) }}
                </text>
                <text class="appt-weak triage-list__no">{{ row.registrationNo }}</text>
                <text v-if="row.signTime" class="appt-weak">
                  签到 {{ shortDateTime(row.signTime) }}（{{ signTypeLabel(row.signType) }}）
                </text>
              </view>
              <view v-if="row.status === 'BOOKED'" class="triage-list__action">
                <wd-button
                  size="small"
                  variant="plain"
                  type="primary"
                  :loading="signingId === row.registrationId"
                  :disabled="Boolean(signingId)"
                  @click="doSign(row)"
                >补签</wd-button>
              </view>
            </view>
          </view>
        </view>

        <view v-if="rows.length" class="triage-list__footer">
          <text class="appt-weak">{{ loadingMore ? '加载中…' : finished ? '已显示全部' : '上拉加载更多' }}</text>
        </view>
      </PageState>
    </view>

    <view class="triage-list__tabbar-gap" />
    <TriageTabbar active="list" />
  </view>
</template>

<style lang="scss" scoped>
.triage-list {
  &__dates {
    display: flex;
    padding: 16rpx 24rpx;
    background-color: var(--appt-surface);
  }

  &__date {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    padding: 10rpx 0;
    border-radius: 12rpx;

    &--active {
      background-color: var(--appt-primary);

      .triage-list__week,
      .triage-list__day {
        color: #ffffff;
      }
    }
  }

  &__week {
    font-size: 22rpx;
    color: var(--appt-text-sub);
  }

  &__day {
    margin-top: 4rpx;
    font-size: 28rpx;
    font-weight: 600;
    color: var(--appt-text);
    font-variant-numeric: tabular-nums;
  }

  &__body {
    padding-top: 20rpx;
  }

  &__group + &__group {
    margin-top: 24rpx;
  }

  &__group-title {
    display: block;
    margin-bottom: 12rpx;
    font-size: 26rpx;
    color: var(--appt-text-weak);
  }

  &__card {
    padding: 0 28rpx;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    padding: 20rpx 0;
    border-bottom: 1rpx solid var(--appt-line);

    &:last-child {
      border-bottom: none;
    }
  }

  &__main {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  &__line {
    display: flex;
    align-items: center;
    margin-bottom: 6rpx;
  }

  &__patient {
    margin-right: 12rpx;
    font-size: 32rpx;
    font-weight: 600;
    color: var(--appt-text);
  }

  &__no {
    font-variant-numeric: tabular-nums;
  }

  &__action {
    flex: none;
    margin-left: 16rpx;
  }

  &__footer {
    padding: 24rpx 0 24rpx;
    text-align: center;
  }

  &__tabbar-gap {
    height: calc(120rpx + env(safe-area-inset-bottom));
  }
}
</style>
