/**
 * 四态壳：加载（骨架）/ 空 / 错误 + 重试 / 正常（默认插槽）
 *
 * 用法：传 `loading / error / empty`，默认插槽放正常内容，`empty-action` / `error-action` 放额外动作。
 *
 * 约束（DESIGN §6.5）：每个数据区块都要有成对的三态，不允许白屏；
 * 首屏骨架与真实布局同尺寸，避免跳动。
 */
<script setup lang="ts">
withDefaults(
  defineProps<{
    loading?: boolean
    error?: string
    empty?: boolean
    emptyText?: string
    emptyDesc?: string
    /** 骨架条数（列表 3 条 / 卡片 4 条） */
    rows?: number
  }>(),
  {
    loading: false,
    error: '',
    empty: false,
    emptyText: '暂无数据',
    emptyDesc: '',
    rows: 3,
  },
)

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <view class="page-state">
    <template v-if="loading">
      <view v-for="index in rows" :key="index" class="appt-card page-state__skeleton">
        <wd-skeleton theme="paragraph" :row-col="[1, 1, { width: '56%' }]" />
      </view>
    </template>

    <view v-else-if="error" class="page-state__box">
      <text class="page-state__error">{{ error }}</text>
      <wd-button size="small" variant="plain" type="primary" @click="emit('retry')">重试</wd-button>
      <view class="page-state__action">
        <slot name="error-action" />
      </view>
    </view>

    <slot v-else-if="empty" name="empty">
      <view class="page-state__box">
        <wd-empty :tip="emptyText" />
        <text v-if="emptyDesc" class="page-state__desc">{{ emptyDesc }}</text>
        <view class="page-state__action">
          <slot name="empty-action" />
        </view>
      </view>
    </slot>

    <slot v-else />
  </view>
</template>

<style lang="scss" scoped>
.page-state {
  &__skeleton + &__skeleton {
    margin-top: 20rpx;
  }

  &__skeleton {
    padding: 28rpx;
  }

  &__box {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80rpx 40rpx;
  }

  &__error {
    margin-bottom: 24rpx;
    font-size: 28rpx;
    line-height: 1.6;
    color: var(--appt-danger);
    text-align: center;
  }

  &__desc {
    margin-top: 8rpx;
    font-size: 26rpx;
    line-height: 1.6;
    color: var(--appt-text-weak);
    text-align: center;
  }

  &__action {
    margin-top: 28rpx;
  }
}
</style>
