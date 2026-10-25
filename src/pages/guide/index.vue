<script setup lang="ts">
/**
 * 9.15 就诊指南（DESIGN §9.15）
 *
 * 入口：「我的 → 院区与就诊指南」；首页院区卡「院区信息 ›」直接进 §9.16，不经本页。
 * 字段：A1 `campusId / name / address`；规则入口与急诊提示为固定文案（DESIGN §8.3）。
 * 纪律：规则入口、急诊提示、页脚在四态之外常显 —— 院区请求失败不能连规则一起看不到。
 */
import { onShow } from '@dcloudio/uni-app'

import type { CampusVo } from '@/api/appt/types'
import { listCampus } from '@/api/appt/public'
import AppFooter from '@/components/AppFooter.vue'
import EmergencyTip from '@/components/EmergencyTip.vue'
import PageState from '@/components/PageState.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { navigateTo, ROUTES } from '@/router/routes'

const { data: campuses, loading, error, isEmpty, run } = useAsyncData<CampusVo[]>(
  listCampus,
  (list) => list.length === 0,
)

onShow(() => {
  void run()
})

function goCampusInfo(campus: CampusVo): void {
  navigateTo(ROUTES.campusInfo, { campusId: campus.campusId })
}

function goRules(): void {
  navigateTo(ROUTES.guideRules)
}
</script>

<template>
  <view class="appt-page guide">
    <view class="appt-content guide__body">
      <text class="guide__intro">本页为门诊预约的就诊指引，演示数据均为虚构。</text>

      <text class="appt-section-title guide__title">院区信息</text>

      <PageState
        :loading="loading"
        :error="error"
        :empty="isEmpty"
        empty-text="暂无可查询院区"
        empty-desc="请重新加载，或联系门诊服务台确认院区信息"
        :rows="2"
        @retry="run"
      >
        <template #empty-action>
          <wd-button size="small" variant="plain" type="primary" @click="run">重新加载</wd-button>
        </template>

        <view class="appt-card guide__campuses">
          <view
            v-for="campus in campuses || []"
            :key="campus.campusId"
            class="guide__campus appt-press"
            @click="goCampusInfo(campus)"
          >
            <view class="guide__campus-info">
              <text class="appt-title">{{ campus.name }}</text>
              <text class="guide__campus-addr">{{ campus.address || '地址信息暂缺' }}</text>
            </view>
            <text class="guide__arrow">›</text>
          </view>
        </view>
      </PageState>

      <view class="appt-card guide__rules appt-press" @click="goRules">
        <view class="guide__rules-info">
          <text class="appt-title">挂号须知与规则</text>
          <text class="guide__rules-desc">退号、退款到账与爽约</text>
        </view>
        <text class="guide__arrow">›</text>
      </view>

      <EmergencyTip />
      <AppFooter />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.guide {
  &__body {
    padding-top: 24rpx;
  }

  &__intro {
    display: block;
    font-size: 26rpx;
    line-height: 1.6;
    color: var(--appt-text-sub);
  }

  &__title {
    display: block;
    margin-top: 32rpx;
    margin-bottom: 20rpx;
  }

  &__campuses {
    padding-top: 0;
    padding-bottom: 0;
  }

  &__campus {
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    min-height: 96rpx;
    padding: 16rpx 0;
    border-bottom: 1rpx solid var(--appt-line);

    &:last-child {
      border-bottom: none;
    }
  }

  &__campus-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__campus-addr {
    margin-top: 6rpx;
    font-size: 26rpx;
    line-height: 1.5;
    color: var(--appt-text-weak);
  }

  &__arrow {
    flex: none;
    margin-left: 16rpx;
    font-size: 36rpx;
    line-height: 1;
    color: var(--appt-text-weak);
  }

  &__rules {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 20rpx;
  }

  &__rules-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__rules-desc {
    margin-top: 6rpx;
    font-size: 26rpx;
    line-height: 1.5;
    color: var(--appt-text-weak);
  }
}
</style>
