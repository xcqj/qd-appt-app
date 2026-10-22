<script setup lang="ts">
/**
 * 9.5 医生主页（DESIGN §9.5）
 *
 * 字段：A4 `staffId / name / avatarUrl / title / degree / clinicType / deptName / campusName / intro / favorited`；
 * 满诊 / 无号按 A5（staffId 模式）渲染——**本屏只允许这两个词**（红线 6），不出现「有排班 / 无排班 / 今日有号」。
 * `favorited` 本片只读展示（收藏写侧归 S11）。
 */
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'

import { addFavorite, removeFavorite } from '@/api/appt/favorite'
import type { DateVo, StaffDetailVo } from '@/api/appt/types'
import { getScheduleDates, getStaffDetail } from '@/api/appt/public'
import PageState from '@/components/PageState.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { navigateBack, navigateTo, ROUTES } from '@/router/routes'
import { useBookingStore } from '@/store/booking'
import { useUserStore } from '@/store/user'
import { bizMessage, clinicTypeLabel, doctorAvailabilityLabel, titleLabel } from '@/utils/appt'

const booking = useBookingStore()
const userStore = useUserStore()
const staffId = ref('')

const { data: staff, loading, error, run } = useAsyncData<StaffDetailVo>(() => getStaffDetail(staffId.value))

/** 收藏写侧（S11）：只做按钮 loading，不自判是否已收藏（后端幂等） */
const favorited = ref(false)
const favoriteBusy = ref(false)
watch(
  () => staff.value?.favorited,
  (value) => {
    favorited.value = Boolean(value)
  },
  { immediate: true },
)

async function toggleFavorite(): Promise<void> {
  if (!staff.value || favoriteBusy.value) {
    return
  }
  if (!userStore.isLogin) {
    navigateTo(ROUTES.login)
    return
  }
  favoriteBusy.value = true
  try {
    if (favorited.value) {
      await removeFavorite(staff.value.staffId)
      favorited.value = false
      uni.showToast({ title: '已取消收藏', icon: 'none' })
    } else {
      await addFavorite(staff.value.staffId)
      favorited.value = true
      uni.showToast({ title: '已加入我的医生', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: bizMessage(e), icon: 'none' })
  } finally {
    favoriteBusy.value = false
  }
}

/** 满诊 / 无号只在医生主页出现；A5 只用 staffId 模式 */
const { data: dates, run: loadDates } = useAsyncData<DateVo[]>(() => getScheduleDates({ staffId: staffId.value }))

const avatar = computed(() => staff.value?.avatarUrl || staff.value?.avatar || '')
const availability = computed(() => (dates.value ? doctorAvailabilityLabel(dates.value) : ''))
const subtitle = computed(() => {
  if (!staff.value) {
    return ''
  }
  return [staff.value.campusName, staff.value.deptName].filter(Boolean).join(' · ')
})

function goSchedule(): void {
  const detail = staff.value
  if (!detail) {
    return
  }
  booking.setDept({ deptId: detail.deptId, name: detail.deptName })
  booking.setStaff({ staffId: detail.staffId, name: detail.name, title: detail.title })
  navigateTo(ROUTES.schedule)
}

function goBack(): void {
  navigateBack()
}

onLoad((query) => {
  staffId.value = (query?.staffId as string) || booking.staff?.staffId || ''
  void run()
  void loadDates()
})
</script>

<template>
  <view class="appt-page doctor-detail">
    <view class="appt-content doctor-detail__body">
      <PageState :loading="loading" :error="error" @retry="run">
        <template #error-action>
          <wd-button size="small" variant="text" @click="goBack">返回上一页</wd-button>
        </template>

        <view v-if="staff" class="appt-card doctor-detail__profile">
          <view class="doctor-detail__head">
            <image v-if="avatar" class="doctor-detail__avatar" :src="avatar" mode="aspectFill" />
            <view v-else class="doctor-detail__avatar doctor-detail__avatar--empty" />
            <view class="doctor-detail__id">
              <text class="doctor-detail__name">{{ staff.name }}</text>
              <text class="doctor-detail__title">
                {{ titleLabel(staff.title) }}<text v-if="staff.degree" class="doctor-detail__degree">{{ staff.degree }}</text>
              </text>
              <view class="doctor-detail__tags">
                <text class="doctor-detail__tag">{{ clinicTypeLabel(staff.clinicType) }}</text>
                <text v-if="availability" class="doctor-detail__tag doctor-detail__tag--ghost">{{ availability }}</text>
                <text
                  class="doctor-detail__tag doctor-detail__tag--ghost"
                  :class="{ 'doctor-detail__tag--on': favorited }"
                  @click="toggleFavorite"
                >{{ favoriteBusy ? '处理中…' : favorited ? '已收藏' : '收藏' }}</text>
              </view>
            </view>
          </view>
          <view class="appt-divider doctor-detail__divider" />
          <view class="doctor-detail__row">
            <text class="appt-weak">就诊地点</text>
            <text class="appt-text">{{ subtitle || '以排班为准' }}</text>
          </view>
        </view>

        <view v-if="staff" class="appt-card doctor-detail__intro">
          <text class="appt-section-title">擅长</text>
          <text class="doctor-detail__intro-text">{{ staff.intro || '该医生暂未维护擅长方向，具体以门诊现场为准。' }}</text>
        </view>
      </PageState>
    </view>

    <view v-if="staff" class="appt-bottom-bar">
      <wd-button type="primary" block @click="goSchedule">查看排班</wd-button>
    </view>
    <view v-if="staff" class="appt-bottom-placeholder" />
  </view>
</template>

<style lang="scss" scoped>
.doctor-detail {
  &__body {
    padding-top: 24rpx;
  }

  &__head {
    display: flex;
    align-items: center;
  }

  &__avatar {
    flex: none;
    width: 120rpx;
    height: 120rpx;
    margin-right: 24rpx;
    border-radius: 999rpx;
    background-color: var(--appt-surface-weak);

    &--empty {
      background-color: var(--appt-surface-weak);
    }
  }

  &__id {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__name {
    font-size: 40rpx;
    font-weight: 700;
    line-height: 1.3;
    color: var(--appt-text);
  }

  &__title {
    margin-top: 6rpx;
    font-size: 26rpx;
    color: var(--appt-text-sub);
  }

  /* 学位跟在职称后面，用间距分隔（不另起一行） */
  &__degree {
    margin-left: 16rpx;
    color: var(--appt-text-weak);
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    margin-top: 12rpx;
  }

  &__tag {
    margin-right: 12rpx;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
    background-color: rgba(31, 122, 140, 0.12);
    font-size: 22rpx;
    font-weight: 500;
    color: var(--appt-primary);

    &--ghost {
      background-color: var(--appt-surface-weak);
      color: var(--appt-text-sub);
    }

    &--on {
      background-color: rgba(31, 122, 140, 0.12);
      color: var(--appt-primary);
    }
  }

  &__divider {
    margin: 24rpx 0;
  }

  &__row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 8rpx 0;
  }

  &__intro {
    margin-top: 20rpx;
  }

  &__intro-text {
    display: block;
    margin-top: 16rpx;
    font-size: 28rpx;
    line-height: 1.6;
    color: var(--appt-text);
  }
}
</style>
