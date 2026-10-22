<script setup lang="ts">
/**
 * 消息详情（S11）
 *
 * 契约 §6 只有列表（D4）/ 未读数（D5）/ 标记已读（D6），**没有单条详情端点**。
 * 因此详情数据由列表页在跳转前写入本地缓存（key = `appt_notice_<noticeId>`），
 * 本页只做「读缓存 + 进页即标记已读」，不新增后端接口、也不把长正文塞进 URL。
 */
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import type { NoticeVo } from '@/api/appt/types'
import { markNoticeRead } from '@/api/appt/notice'
import PageState from '@/components/PageState.vue'
import { refreshUnreadBadge } from '@/composables/useUnreadBadge'
import { BizError } from '@/types/api'
import { bizMessage, noticeTypeLabel, shortDateTime } from '@/utils/appt'

const CACHE_PREFIX = 'appt_notice_'

const notice = ref<NoticeVo | null>(null)
const loading = ref(true)
const errorText = ref('')
const markedTip = ref('')

const title = computed(() => notice.value?.title ?? '')
const content = computed(() => notice.value?.content ?? '')

function goBack(): void {
  uni.navigateBack()
}

function readCache(noticeId: string): NoticeVo | null {
  try {
    const cached = uni.getStorageSync(`${CACHE_PREFIX}${noticeId}`) as NoticeVo | ''
    if (cached && typeof cached === 'object' && cached.noticeId) {
      return cached
    }
  } catch {
    /* 缓存不可用时按「已失效」处理 */
  }
  return null
}

async function markRead(item: NoticeVo): Promise<void> {
  if (item.readFlag) {
    return
  }
  try {
    await markNoticeRead(item.noticeId)
    item.readFlag = true
    markedTip.value = '已标记为已读'
    void refreshUnreadBadge()
  } catch (e) {
    if (e instanceof BizError && e.code === 404) {
      errorText.value = '该消息不存在或已删除'
      return
    }
    markedTip.value = bizMessage(e)
  }
}

onLoad((query) => {
  const noticeId = (query?.noticeId as string) ?? ''
  const cached = noticeId ? readCache(noticeId) : null
  if (!cached) {
    loading.value = false
    errorText.value = '该消息不存在或已删除，请返回列表重试'
    return
  }
  notice.value = cached
  loading.value = false
  void markRead(cached)
})
</script>

<template>
  <view class="appt-page notice-detail">
    <view class="appt-content notice-detail__body">
      <PageState :loading="loading" :error="errorText" :rows="2">
        <template #error-action>
          <wd-button size="small" variant="text" @click="goBack()">返回列表</wd-button>
        </template>

        <view v-if="notice" class="appt-card">
          <view class="notice-detail__head">
            <text class="notice-detail__title">{{ title }}</text>
            <text class="notice-detail__time">{{ shortDateTime(notice.createTime) }}</text>
          </view>
          <view class="notice-detail__meta">
            <text class="notice-detail__type">{{ noticeTypeLabel(notice.type) }}</text>
            <text v-if="markedTip" class="appt-weak">{{ markedTip }}</text>
          </view>
          <text class="notice-detail__content">{{ content }}</text>
        </view>

        <view class="notice-detail__footer">
          <wd-button size="small" variant="plain" @click="goBack()">返回列表</wd-button>
        </view>
      </PageState>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.notice-detail {
  &__body {
    padding-top: 24rpx;
  }

  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  &__title {
    flex: 1;
    font-size: 36rpx;
    font-weight: 600;
    line-height: 1.4;
    color: var(--appt-text);
  }

  &__time {
    flex: none;
    margin-left: 16rpx;
    font-size: 24rpx;
    color: var(--appt-text-weak);
    font-variant-numeric: tabular-nums;
  }

  &__meta {
    display: flex;
    align-items: center;
    margin-top: 12rpx;
  }

  &__type {
    margin-right: 12rpx;
    padding: 2rpx 12rpx;
    border-radius: 8rpx;
    background-color: var(--appt-surface-weak);
    font-size: 22rpx;
    color: var(--appt-text-sub);
  }

  &__content {
    display: block;
    margin-top: 24rpx;
    font-size: 28rpx;
    line-height: 1.7;
    color: var(--appt-text);
  }

  &__footer {
    padding: 32rpx 0;
    text-align: center;
  }
}
</style>
