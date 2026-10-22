<script setup lang="ts">
/**
 * 9.4 医生列表（DESIGN §9.4）
 *
 * 字段：A3 `staffId / name / avatarUrl / title / degree / campusName`。
 * A3 无 clinicType / deptName / intro / 余量 → 不渲染门诊类型、擅长、余量标签（「满诊 / 无号」只在医生主页）。
 */
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import type { StaffVo } from '@/api/appt/types'
import { listStaff } from '@/api/appt/public'
import DoctorCard from '@/components/DoctorCard.vue'
import PageState from '@/components/PageState.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { navigateBack, navigateTo, ROUTES } from '@/router/routes'
import { useBookingStore } from '@/store/booking'

const booking = useBookingStore()
const deptId = ref('')

const { data: staffList, loading, error, isEmpty, run } = useAsyncData<StaffVo[]>(
  async () => {
    const page = await listStaff({
      deptId: deptId.value,
      campusId: booking.campusId,
      pageNum: 1,
      pageSize: 50,
    })
    return page.rows
  },
  (rows) => rows.length === 0,
)

const deptName = computed(() => booking.dept?.name ?? '')
const campusName = computed(() => booking.campus?.name ?? '')

function openDetail(staff: StaffVo): void {
  booking.setStaff({ staffId: staff.staffId, name: staff.name, title: staff.title })
  navigateTo(ROUTES.doctorDetail, { staffId: staff.staffId })
}

function changeDept(): void {
  navigateBack()
}

onLoad((query) => {
  deptId.value = (query?.deptId as string) || booking.dept?.deptId || ''
  if (booking.dept?.deptId !== deptId.value && deptId.value) {
    booking.setDept({ deptId: deptId.value, name: booking.dept?.name ?? '' })
  }
  void run()
})
</script>

<template>
  <view class="appt-page doctor-list">
    <view class="doctor-list__head">
      <text class="appt-title">{{ deptName || '出诊医生' }}</text>
      <text class="appt-weak">{{ campusName }}</text>
    </view>

    <view class="appt-content">
      <PageState
        :loading="loading"
        :error="error"
        :empty="isEmpty"
        empty-text="该科室暂无出诊医生"
        empty-desc="请选择其他科室，或稍后重试"
        :rows="4"
        @retry="run"
      >
        <template #empty-action>
          <wd-button size="small" variant="plain" type="primary" @click="changeDept">选择其他科室</wd-button>
        </template>

        <view class="doctor-list__grid">
          <view v-for="staff in staffList || []" :key="staff.staffId" class="doctor-list__cell">
            <DoctorCard :staff="staff" @select="openDetail(staff)" />
          </view>
        </view>
      </PageState>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.doctor-list {
  &__head {
    display: flex;
    flex-direction: column;
    padding: 24rpx 32rpx 8rpx;
  }

  &__grid {
    display: flex;
    flex-wrap: wrap;
    margin: 20rpx -10rpx 0;
  }

  &__cell {
    box-sizing: border-box;
    width: 50%;
    padding: 0 10rpx;
    margin-bottom: 20rpx;
  }
}
</style>
