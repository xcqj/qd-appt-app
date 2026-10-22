<script setup lang="ts">
/**
 * 我的医生（S11 · 契约 §6.1–§6.3）
 *
 * 字段：D1 `staffId / name / avatarUrl / title / deptName / campusName / favoriteTime`（按收藏时间倒序）。
 * 取消收藏走 D3（未收藏也返回成功，前端不预判）；行点击进医生主页（A4 给 deptId，才能继续看排班）。
 */
import { onReachBottom, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import type { FavoriteStaffVo } from '@/api/appt/types'
import { listFavorites, removeFavorite } from '@/api/appt/favorite'
import PageState from '@/components/PageState.vue'
import { navigateTo, ROUTES, switchTab } from '@/router/routes'
import { bizMessage, titleLabel } from '@/utils/appt'

const PAGE_SIZE = 20

const rows = ref<FavoriteStaffVo[]>([])
const total = ref(0)
const pageNum = ref(1)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')

const isEmpty = computed(() => !loading.value && !error.value && rows.value.length === 0)
const finished = computed(() => rows.value.length >= total.value)

async function load(reset: boolean): Promise<void> {
  if (reset) {
    pageNum.value = 1
    loading.value = true
    error.value = ''
  } else {
    loadingMore.value = true
  }
  try {
    const page = await listFavorites({ pageNum: pageNum.value, pageSize: PAGE_SIZE })
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

function openDoctor(item: FavoriteStaffVo): void {
  navigateTo(ROUTES.doctorDetail, { staffId: item.staffId })
}

function confirmRemove(item: FavoriteStaffVo): void {
  uni.showModal({
    title: '取消收藏',
    content: `确定不再关注「${item.name}」吗？`,
    cancelText: '取消',
    confirmText: '取消收藏',
    success: (res) => {
      if (res.confirm) {
        void doRemove(item)
      }
    },
  })
}

async function doRemove(item: FavoriteStaffVo): Promise<void> {
  try {
    await removeFavorite(item.staffId)
    rows.value = rows.value.filter((row) => row.staffId !== item.staffId)
    total.value = Math.max(total.value - 1, 0)
    uni.showToast({ title: '已取消收藏', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: bizMessage(e), icon: 'none' })
  }
}

function goDoctors(): void {
  switchTab(ROUTES.home)
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
  <view class="appt-page favorite">
    <view class="appt-content favorite__body">
      <PageState
        :loading="loading"
        :error="error"
        :empty="isEmpty"
        empty-text="暂无收藏的医生"
        empty-desc="在医生主页点击收藏后，可在此快速查看"
        :rows="4"
        @retry="load(true)"
      >
        <template #empty-action>
          <wd-button size="small" type="primary" @click="goDoctors">去预约</wd-button>
        </template>

        <view v-for="item in rows" :key="item.staffId" class="appt-card favorite__row appt-press">
          <view class="favorite__main" @click="openDoctor(item)">
            <image v-if="item.avatarUrl || item.avatar" class="favorite__avatar" :src="item.avatarUrl || item.avatar" mode="aspectFill" />
            <view v-else class="favorite__avatar favorite__avatar--empty" />
            <view class="favorite__info">
              <view class="favorite__name-row">
                <text class="favorite__name">{{ item.name }}</text>
                <text class="appt-weak">{{ titleLabel(item.title) }}</text>
              </view>
              <text class="appt-weak">
                {{ [item.campusName, item.deptName].filter(Boolean).join(' · ') || '出诊信息以排班为准' }}
              </text>
            </view>
            <text class="favorite__time">{{ (item.favoriteTime || '').slice(5, 16) }}</text>
          </view>
          <view class="favorite__actions">
            <text class="favorite__action" @click="confirmRemove(item)">取消收藏</text>
          </view>
        </view>

        <view v-if="rows.length" class="favorite__footer">
          <text class="appt-weak">{{ loadingMore ? '加载中…' : finished ? '已显示全部' : '上拉加载更多' }}</text>
        </view>
      </PageState>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.favorite {
  &__body {
    padding-top: 24rpx;
  }

  &__row + &__row {
    margin-top: 16rpx;
  }

  &__main {
    display: flex;
    align-items: center;
  }

  &__avatar {
    flex: none;
    width: 88rpx;
    height: 88rpx;
    margin-right: 20rpx;
    border-radius: 999rpx;
    background-color: var(--appt-surface-weak);

    &--empty {
      background-color: var(--appt-surface-weak);
    }
  }

  &__info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  &__name-row {
    display: flex;
    align-items: baseline;
    margin-bottom: 6rpx;
  }

  &__name {
    margin-right: 12rpx;
    font-size: 32rpx;
    font-weight: 600;
    color: var(--appt-text);
  }

  &__time {
    flex: none;
    margin-left: 12rpx;
    font-size: 22rpx;
    color: var(--appt-text-weak);
    font-variant-numeric: tabular-nums;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 16rpx;
  }

  &__action {
    font-size: 26rpx;
    color: var(--appt-danger);
  }

  &__footer {
    padding: 24rpx 0 40rpx;
    text-align: center;
  }
}
</style>
