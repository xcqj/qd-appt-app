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
import AppFooter from '@/components/AppFooter.vue'
import EmergencyTip from '@/components/EmergencyTip.vue'
import PageState from '@/components/PageState.vue'
import StepGuide from '@/components/StepGuide.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { navigateTo, ROUTES, switchTab } from '@/router/routes'
import type { CampusRef } from '@/store/booking'
import { useBookingStore } from '@/store/booking'
import { useUserStore } from '@/store/user'
import { goFallback } from '@/utils/fallback'

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

/**
 * 首屏院区列表是整条挂号链路的入口。
 *
 * 只有**真离线**（`navigator.onLine === false`）才跳兜底页；接口偶发失败仍走页内错误态 + 重试。
 * 原因：冷启动时首帧请求可能先于登录态恢复/路由就绪，一律跳兜底会让「打开链接就看到网络异常」，
 * 反而像故障（2026-10-24 截图脚本实测复现：同 URL 有时首页、有时兜底页）。
 */
async function loadCampuses(): Promise<void> {
  const list = await run()
  if (!list && error.value && navigator.onLine === false) {
    goFallback('offline')
  }
}

onShow(() => {
  void loadCampuses()
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

/** 院区卡次入口（DESIGN §9.1）：只进院区详情，不改动卡片主体的选院区语义 */
function goCampusInfo(campus: CampusVo): void {
  navigateTo(ROUTES.campusInfo, { campusId: campus.campusId })
}

function goRules(): void {
  navigateTo(ROUTES.guideRules)
}
</script>

<template>
  <view class="appt-page home">
    <view class="home__hero">
      <view class="home__brand">
        <image class="home__mark" src="/static/brand/logo-compact-inverse-48.png" mode="aspectFit" />
        <text class="home__title">预约挂号</text>
      </view>
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
              <view class="home__campus-head">
                <text class="appt-title">{{ campus.name }}</text>
                <text class="home__campus-more" @click.stop="goCampusInfo(campus)">院区信息</text>
              </view>
              <text class="home__campus-addr">{{ campus.address || '地址信息暂缺' }}</text>
            </view>
            <text class="home__chevron">›</text>
          </view>
        </view>
      </PageState>

      <view class="appt-card home__guide">
        <StepGuide title="就诊流程" />
        <text class="appt-link home__guide-link" @click="goRules">查看预约须知 ›</text>
      </view>

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

      <EmergencyTip />
      <AppFooter />
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

  &__brand {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  /* 简化档母标（24–48px 档）：品牌区高度 240rpx 内与标题同行，不额外占高 */
  &__mark {
    flex: none;
    width: 56rpx;
    height: 56rpx;
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
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  &__campus-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  /*
   * 次入口：`@click.stop` 只进院区详情。
   * 触控高度靠 padding 撑到 88rpx，再用等量负 margin 抵掉占位 ——
   * 卡片高度与名称/地址间距维持原样，不做成「一行两箭头」也不把卡撑高。
   */
  &__campus-more {
    flex: none;
    margin: -28rpx 0 -28rpx 16rpx;
    padding: 28rpx 0 28rpx 16rpx;
    font-size: 22rpx;
    line-height: 1.4;
    color: var(--appt-primary);
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

  /* 流程说明卡：静态五步，不发请求（DESIGN §9.1） */
  &__guide {
    margin-top: 20rpx;
  }

  &__guide-link {
    display: block;
    margin-top: 20rpx;
    text-align: right;
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

}
</style>
