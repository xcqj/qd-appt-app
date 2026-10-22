<script setup lang="ts">
/**
 * 9.1 首页（DESIGN §9.1）
 *
 * 信息层级：品牌区（唯一渐变）→ 院区卡 ×3 → 快捷科室（仅「选过院区」时出现）→ 原生 tab。
 * 字段：A1（campusId / name / address）；快捷科室用 A2 的一级节点（必须带上次院区 campusId）。
 */
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import type { CampusVo, DeptTreeVo } from '@/api/appt/types'
import { getDeptTree, listCampus } from '@/api/appt/public'
import PageState from '@/components/PageState.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { navigateTo, ROUTES, switchTab } from '@/router/routes'
import type { CampusRef } from '@/store/booking'
import { useBookingStore } from '@/store/booking'
import { useUserStore } from '@/store/user'

const booking = useBookingStore()
const userStore = useUserStore()

const { data: campuses, loading, error, isEmpty, run } = useAsyncData<CampusVo[]>(
  listCampus,
  (list) => list.length === 0,
)

const shortcuts = ref<DeptTreeVo[]>([])
const lastCampus = ref<CampusRef | null>(null)

const shortcutTitle = computed(() =>
  lastCampus.value ? `${lastCampus.value.name} · 快捷科室` : '快捷科室',
)

/** A2 的 campusId 必填；没选过院区就整块不渲染（不留空壳） */
async function loadShortcuts(): Promise<void> {
  const cached = booking.restoreLastCampus()
  lastCampus.value = cached
  if (!cached) {
    shortcuts.value = []
    return
  }
  try {
    const tree = await getDeptTree(cached.campusId)
    shortcuts.value = tree.slice(0, 4)
  } catch {
    shortcuts.value = []
  }
}

onShow(() => {
  void run()
  void loadShortcuts()
})

function goLogin(): void {
  navigateTo(ROUTES.login)
}

function goMine(): void {
  switchTab(ROUTES.registration)
}

function goCampus(): void {
  navigateTo(ROUTES.campus)
}

function pickCampus(campus: CampusVo): void {
  booking.setCampus({ campusId: campus.campusId, name: campus.name, address: campus.address })
  navigateTo(ROUTES.dept)
}

function pickShortcut(dept: DeptTreeVo): void {
  if (lastCampus.value) {
    booking.setCampus(lastCampus.value)
  }
  navigateTo(ROUTES.dept, { rootId: dept.deptId })
}
</script>

<template>
  <view class="appt-page home">
    <view class="home__hero">
      <text class="home__title">预约挂号</text>
      <text class="home__sub">选择就诊院区，开始预约挂号 · 演示数据均为虚构</text>
      <text v-if="!userStore.isLogin" class="home__link" @click="goLogin">未登录，点击登录 ›</text>
      <text v-else class="home__link" @click="goMine">{{ userStore.displayName }} · 我的预约 ›</text>
    </view>

    <view class="appt-content home__body">
      <view class="home__section">
        <text class="appt-section-title">选择院区</text>
        <text class="appt-link" @click="goCampus">切换院区</text>
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
        <view class="home__campuses">
          <view
            v-for="campus in campuses || []"
            :key="campus.campusId"
            class="appt-card home__campus appt-press"
            @click="pickCampus(campus)"
          >
            <view class="home__campus-info">
              <text class="appt-title">{{ campus.name }}</text>
              <text class="home__campus-addr">{{ campus.address || '地址信息暂缺' }}</text>
            </view>
            <text class="home__chevron">›</text>
          </view>
        </view>
      </PageState>

      <view v-if="shortcuts.length" class="home__shortcuts">
        <text class="appt-section-title">{{ shortcutTitle }}</text>
        <view class="home__grid">
          <view
            v-for="dept in shortcuts"
            :key="dept.deptId"
            class="home__shortcut appt-press"
            @click="pickShortcut(dept)"
          >
            {{ dept.name }}
          </view>
        </view>
      </view>

      <text class="home__footnote">本系统为演示环境，数据均为虚构，支付走模拟渠道，不提供真实医疗服务。</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.home {
  padding-bottom: 40rpx;

  /* 唯一渐变：干净通栏色块，无装饰圆点 / 波纹 */
  &__hero {
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-sizing: border-box;
    height: 240rpx;
    padding: 0 32rpx;
    background: linear-gradient(135deg, #1f7a8c 0%, #2a9d8f 100%);
  }

  &__title {
    font-size: 56rpx;
    font-weight: 700;
    line-height: 1.2;
    color: #ffffff;
  }

  &__sub {
    margin-top: 12rpx;
    font-size: 26rpx;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.9);
  }

  &__link {
    margin-top: 16rpx;
    font-size: 26rpx;
    color: #ffffff;
    text-decoration: underline;
  }

  &__body {
    padding-top: 32rpx;
  }

  &__section {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  &__campuses {
    margin-top: 20rpx;
  }

  &__campus {
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    min-height: 116rpx;

    & + & {
      margin-top: 20rpx;
    }
  }

  &__campus-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__campus-addr {
    margin-top: 8rpx;
    font-size: 26rpx;
    color: var(--appt-text-weak);
  }

  &__chevron {
    flex: none;
    margin-left: 16rpx;
    font-size: 36rpx;
    color: var(--appt-text-weak);
  }

  &__shortcuts {
    margin-top: 40rpx;
  }

  &__grid {
    display: flex;
    flex-wrap: wrap;
    margin-top: 20rpx;
    border-radius: 24rpx;
    background-color: var(--appt-surface);
    box-shadow: var(--appt-shadow-card);
  }

  &__shortcut {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 25%;
    height: 112rpx;
    padding: 0 8rpx;
    font-size: 26rpx;
    color: var(--appt-text);
    text-align: center;
  }

  &__footnote {
    display: block;
    margin-top: 40rpx;
    font-size: 20rpx;
    line-height: 1.6;
    color: var(--appt-text-weak);
  }
}
</style>
