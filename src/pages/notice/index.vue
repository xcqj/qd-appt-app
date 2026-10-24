<script setup lang="ts">
/**
 * 消息（S11 · 契约 §6.4–§6.6）
 *
 * 字段：D4 `noticeId / type / title / content / readFlag / createTime`（`type` 是线值，中文映射在前端）。
 * 未读：tabBar 角标（D5）+ 列表蓝点；点开即标记已读（D6）。
 * D6 三态由后端保证：未读→成功、已读→幂等成功、别人的/不存在→**404**（页面按「已失效」处理）。
 */
import { onReachBottom, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import type { NoticeVo } from '@/api/appt/types'
import { listNotices, markNoticeRead } from '@/api/appt/notice'
import PageState from '@/components/PageState.vue'
import { refreshUnreadBadge } from '@/composables/useUnreadBadge'
import { navigateTo, ROUTES } from '@/router/routes'
import { useUserStore } from '@/store/user'
import { BizError } from '@/types/api'
import { bizMessage, noticeTypeLabel, shortDateTime } from '@/utils/appt'

type TabKey = 'all' | 'unread'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
]

const PAGE_SIZE = 10

const userStore = useUserStore()

const activeTab = ref<TabKey>('all')
const rows = ref<NoticeVo[]>([])
const total = ref(0)
const pageNum = ref(1)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')

const isEmpty = computed(() => !loading.value && !error.value && rows.value.length === 0)
const finished = computed(() => rows.value.length >= total.value)
const emptyText = computed(() => (activeTab.value === 'unread' ? '没有未读消息' : '暂无消息'))

async function load(reset: boolean): Promise<void> {
  // 未登录不请求（守卫放行 tab 页，页面自己渲染未登录态，避免 401 把人弹走）
  if (!userStore.isLogin) {
    rows.value = []
    total.value = 0
    return
  }
  if (reset) {
    pageNum.value = 1
    loading.value = true
    error.value = ''
  } else {
    loadingMore.value = true
  }
  try {
    const page = await listNotices({
      readFlag: activeTab.value === 'unread' ? false : undefined,
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

function goLogin(): void {
  navigateTo(ROUTES.login)
}

function switchTabTo(key: TabKey): void {
  if (activeTab.value === key) {
    return
  }
  activeTab.value = key
  void load(true)
}

/** 详情页没有单条查询端点（契约 §6 只有列表），跳转前把整条消息写本地缓存 */
function cacheNotice(item: NoticeVo): void {
  try {
    uni.setStorageSync(`appt_notice_${item.noticeId}`, item)
  } catch {
    /* 缓存不可用时详情页会提示「已失效」，不阻塞跳转 */
  }
}

async function openNotice(item: NoticeVo): Promise<void> {
  if (!item.readFlag) {
    try {
      await markNoticeRead(item.noticeId)
      item.readFlag = true
      if (activeTab.value === 'unread') {
        rows.value = rows.value.filter((row) => row.noticeId !== item.noticeId)
        total.value = Math.max(total.value - 1, 0)
      }
      void refreshUnreadBadge()
    } catch (e) {
      if (e instanceof BizError && e.code === 404) {
        uni.showToast({ title: '该消息不存在或已删除', icon: 'none' })
        void load(true)
        return
      }
      uni.showToast({ title: bizMessage(e), icon: 'none' })
    }
  }
  cacheNotice(item)
  navigateTo(ROUTES.noticeDetail, { noticeId: item.noticeId })
}

onShow(() => {
  void load(true)
  void refreshUnreadBadge()
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
  <view class="appt-page notice">
    <view class="notice__tabs">
      <view
        v-for="tab in TABS"
        :key="tab.key"
        class="notice__tab"
        :class="{ 'notice__tab--active': activeTab === tab.key }"
        @click="switchTabTo(tab.key)"
      >
        {{ tab.label }}
      </view>
    </view>

    <view class="appt-content notice__body">
      <PageState v-if="!userStore.isLogin" :empty="true" empty-text="未登录，无法查看消息"
        empty-desc="登录后可查看预约、支付与停诊通知">
        <template #empty-action>
          <wd-button size="small" type="primary" @click="goLogin">去登录</wd-button>
        </template>
      </PageState>

      <PageState
        v-else
        :loading="loading"
        :error="error"
        :empty="isEmpty"
        :empty-text="emptyText"
        empty-desc="预约与支付的状态变更将在此通知"
        :rows="3"
        @retry="load(true)"
      >
        <view
          v-for="item in rows"
          :key="item.noticeId"
          class="appt-card notice__card appt-press"
          :class="{ 'notice__card--unread': !item.readFlag }"
          @click="openNotice(item)"
        >
          <view class="notice__head">
            <view class="notice__title-row">
              <view v-if="!item.readFlag" class="notice__dot" />
              <text class="notice__title">{{ item.title }}</text>
            </view>
            <text class="notice__time">{{ shortDateTime(item.createTime) }}</text>
          </view>
          <text class="notice__type">{{ noticeTypeLabel(item.type) }}</text>
          <text class="notice__content">{{ item.content }}</text>
        </view>

        <view v-if="rows.length" class="notice__footer">
          <text class="appt-weak">{{ loadingMore ? '加载中…' : finished ? '已显示全部' : '上拉加载更多' }}</text>
        </view>
      </PageState>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.notice {
  &__tabs {
    display: flex;
    background-color: var(--appt-surface);
  }

  &__tab {
    position: relative;
    flex: 1;
    padding: 24rpx 0;
    font-size: 28rpx;
    color: var(--appt-text-weak);
    text-align: center;

    &--active {
      font-weight: 600;
      color: var(--appt-primary);

      &::after {
        position: absolute;
        bottom: 8rpx;
        left: 50%;
        width: 48rpx;
        height: 4rpx;
        margin-left: -24rpx;
        border-radius: 999rpx;
        background-color: var(--appt-primary);
        content: '';
      }
    }
  }

  &__body {
    padding-top: 20rpx;
  }

  &__card + &__card {
    margin-top: 16rpx;
  }

  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  &__title-row {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }

  &__dot {
    flex: none;
    width: 12rpx;
    height: 12rpx;
    margin-right: 12rpx;
    border-radius: 999rpx;
    background-color: var(--appt-info);
  }

  &__title {
    flex: 1;
    font-size: 32rpx;
    font-weight: 600;
    line-height: 1.4;
    color: var(--appt-text);
  }

  &__time {
    flex: none;
    margin-left: 16rpx;
    font-size: 22rpx;
    color: var(--appt-text-weak);
    font-variant-numeric: tabular-nums;
  }

  &__type {
    display: inline-block;
    margin-top: 10rpx;
    padding: 2rpx 12rpx;
    border-radius: 8rpx;
    background-color: var(--appt-surface-weak);
    font-size: 22rpx;
    color: var(--appt-text-sub);
  }

  &__content {
    display: block;
    margin-top: 12rpx;
    font-size: 26rpx;
    line-height: 1.6;
    color: var(--appt-text-sub);
  }

  &__footer {
    padding: 24rpx 0 40rpx;
    text-align: center;
  }
}
</style>
