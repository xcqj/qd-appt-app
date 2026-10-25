<script setup lang="ts">
/**
 * 9.16 院区详情（DESIGN §9.16）
 *
 * 入口：首页院区卡「院区信息 ›」/ §9.15 院区行；参数 `campusId` 是**字符串**，禁止数值转换。
 * 字段：A1 `campusId / name / address`；联系电话 / 门诊时间 / 交通指引取自
 *       `utils/campusProfile.ts` 的虚构常量（契约与 appt_campus 均无这三类字段）。
 * 四态：骨架 / 正常 / 查无该院区（空态 + 返回指南）/ 异常（文案 + 重试）。
 */
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import type { CampusVo } from '@/api/appt/types'
import { listCampus } from '@/api/appt/public'
import AppFooter from '@/components/AppFooter.vue'
import PageState from '@/components/PageState.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { navigateTo, redirectTo, ROUTES } from '@/router/routes'
import { useBookingStore } from '@/store/booking'
import { campusProfile } from '@/utils/campusProfile'

const booking = useBookingStore()
const campusId = ref('')

const { data: campuses, loading, error, isEmpty, run } = useAsyncData<CampusVo[]>(
  listCampus,
  // 只关心「这个院区是否存在」：查不到按空态处理，不报错误
  (list) => !list.some((item) => item.campusId === campusId.value),
)

const campus = computed(
  () => (campuses.value || []).find((item) => item.campusId === campusId.value) ?? null,
)

const profile = computed(() => campusProfile(campus.value?.name))

onLoad((query) => {
  campusId.value = (query?.campusId as string) ?? ''
  void run()
})

function choose(): void {
  const item = campus.value
  if (!item) {
    return
  }
  booking.setCampus({ campusId: item.campusId, name: item.name, address: item.address })
  navigateTo(ROUTES.dept)
}

function goGuide(): void {
  redirectTo(ROUTES.guide)
}
</script>

<template>
  <view class="appt-page info">
    <PageState
      :loading="loading"
      :error="error"
      :empty="isEmpty"
      empty-text="未找到该院区信息"
      empty-desc="请从就诊指南重新选择院区"
      :rows="2"
      @retry="run"
    >
      <template #empty-action>
        <wd-button size="small" variant="plain" type="primary" @click="goGuide">返回就诊指南</wd-button>
      </template>

      <template v-if="campus">
        <view class="appt-content info__head">
          <text class="info__name">{{ campus.name }}</text>
          <text class="info__addr">{{ campus.address || '地址信息暂缺' }}</text>
        </view>

        <view class="appt-content info__body">
          <view class="appt-card">
            <view class="info__row">
              <text class="appt-sub">联系电话</text>
              <text class="info__value info__value--num">{{ profile.tel }}</text>
            </view>

            <view class="info__block">
              <text class="appt-sub">门诊时间</text>
              <view class="info__lines">
                <text v-for="line in profile.clinicHours" :key="line" class="info__line">{{ line }}</text>
              </view>
            </view>

            <view class="info__block">
              <text class="appt-sub">交通指引</text>
              <view class="info__lines">
                <text v-for="line in profile.traffic" :key="line" class="info__line">{{ line }}</text>
              </view>
            </view>
          </view>

          <view class="info__action">
            <wd-button type="primary" block @click="choose">选择该院区，开始预约</wd-button>
          </view>

          <text class="info__note">院区联系电话、门诊时间与交通指引为演示数据。</text>

          <AppFooter />
        </view>
      </template>
    </PageState>
  </view>
</template>

<style lang="scss" scoped>
.info {
  padding-bottom: 40rpx;

  &__head {
    display: flex;
    flex-direction: column;
    padding-top: 32rpx;
  }

  &__name {
    font-size: 44rpx;
    font-weight: 600;
    line-height: 1.3;
    color: var(--appt-text);
  }

  &__addr {
    margin-top: 8rpx;
    font-size: 26rpx;
    line-height: 1.5;
    color: var(--appt-text-sub);
  }

  &__body {
    padding-top: 24rpx;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    min-height: 96rpx;
    padding: 16rpx 0;
    border-bottom: 1rpx solid var(--appt-line);
  }

  &__block {
    display: flex;
    flex-direction: column;
    padding: 24rpx 0;
    border-bottom: 1rpx solid var(--appt-line);

    &:last-child {
      padding-bottom: 8rpx;
      border-bottom: none;
    }
  }

  &__value {
    max-width: 440rpx;
    font-size: 28rpx;
    line-height: 1.6;
    color: var(--appt-text-sub);
    text-align: right;

    &--num {
      font-variant-numeric: tabular-nums;
      letter-spacing: 1rpx;
    }
  }

  &__lines {
    display: flex;
    flex-direction: column;
    margin-top: 8rpx;
  }

  &__line {
    font-size: 28rpx;
    line-height: 1.6;
    color: var(--appt-text-sub);

    & + & {
      margin-top: 4rpx;
    }
  }

  &__action {
    margin-top: 32rpx;
  }

  &__note {
    display: block;
    margin-top: 20rpx;
    font-size: 24rpx;
    line-height: 1.5;
    color: var(--appt-text-weak);
  }
}
</style>
