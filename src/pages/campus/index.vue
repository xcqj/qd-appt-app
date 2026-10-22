<script setup lang="ts">
/**
 * 9.2 选院区（DESIGN §9.2）
 *
 * 字段：A1 `campusId / name / address / coverUrl / coverImageUrl`（封面为空用浅表面占位）。
 * 选中态**唯一**：全屏最多一张卡带左侧 4rpx 竖条与「当前」标签（Stitch 出图三张全标「当前」是错的）。
 */
import { onShow } from '@dcloudio/uni-app'
import { computed } from 'vue'

import type { CampusVo } from '@/api/appt/types'
import { listCampus } from '@/api/appt/public'
import PageState from '@/components/PageState.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { ROUTES, switchTab } from '@/router/routes'
import { useBookingStore } from '@/store/booking'

const booking = useBookingStore()

const { data: campuses, loading, error, isEmpty, run } = useAsyncData<CampusVo[]>(
  listCampus,
  (list) => list.length === 0,
)

const currentId = computed(() => booking.campus?.campusId ?? '')

onShow(() => {
  void run()
})

function choose(campus: CampusVo): void {
  booking.setCampus({ campusId: campus.campusId, name: campus.name, address: campus.address })
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
    return
  }
  switchTab(ROUTES.home)
}
</script>

<template>
  <view class="appt-page campus">
    <view class="appt-content campus__body">
      <view class="campus__head">
        <text class="appt-section-title">选择就诊院区</text>
        <text class="appt-weak">选定后可按院区筛选医生</text>
      </view>

      <PageState
        :loading="loading"
        :error="error"
        :empty="isEmpty"
        empty-text="暂无可预约院区"
        empty-desc="请稍后重试，或联系门诊服务台确认放号时间"
        :rows="3"
        @retry="run"
      >
        <view class="campus__list">
          <view
            v-for="campus in campuses || []"
            :key="campus.campusId"
            class="campus__card appt-press"
            :class="{ 'campus__card--active': campus.campusId === currentId }"
            @click="choose(campus)"
          >
            <image
              v-if="campus.coverImageUrl || campus.coverUrl"
              class="campus__cover"
              :src="campus.coverImageUrl || campus.coverUrl"
              mode="aspectFill"
            />
            <view v-else class="campus__cover campus__cover--empty" />
            <view class="campus__info">
              <view class="campus__name-row">
                <text class="appt-title campus__name">{{ campus.name }}</text>
                <text v-if="campus.campusId === currentId" class="campus__badge">当前</text>
              </view>
              <text class="appt-weak">{{ campus.address || '地址信息暂缺' }}</text>
            </view>
          </view>
        </view>
      </PageState>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.campus {
  &__body {
    padding-top: 32rpx;
  }

  &__head {
    display: flex;
    flex-direction: column;
    margin-bottom: 24rpx;
  }

  &__list {
    display: flex;
    flex-direction: column;
  }

  &__card {
    position: relative;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    overflow: hidden;
    padding: 24rpx;
    border-radius: 20rpx;
    background-color: var(--appt-surface);
    box-shadow: var(--appt-shadow-card);

    & + & {
      margin-top: 16rpx;
    }

    /* 选中态：左侧 4rpx 主色竖条 */
    &--active::before {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 4rpx;
      content: '';
      background-color: var(--appt-primary);
    }
  }

  &__cover {
    flex: none;
    width: 120rpx;
    height: 120rpx;
    margin-right: 24rpx;
    border-radius: 16rpx;
    background-color: var(--appt-surface-weak);

    &--empty {
      background-color: var(--appt-surface-weak);
    }
  }

  &__info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__name-row {
    display: flex;
    align-items: center;
    margin-bottom: 8rpx;
  }

  &__name {
    margin-right: 12rpx;
  }

  &__badge {
    padding: 2rpx 12rpx;
    border-radius: 8rpx;
    background-color: rgba(31, 122, 140, 0.12);
    font-size: 22rpx;
    font-weight: 500;
    color: var(--appt-primary);
  }
}
</style>
