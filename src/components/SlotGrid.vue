/**
 * 号源格子（DESIGN §5 第 7 类 / §9.6B）
 *
 * A7 **只返回可约号源**（`TAKEN` 不出现，契约 §3.7）→ 这里只有「可约 / 已选」两态，
 * 不补占位格、不自己算已约。
 */
<script setup lang="ts">
import type { SlotVo } from '@/api/appt/types'

defineProps<{ slots: SlotVo[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [slot: SlotVo] }>()
</script>

<template>
  <view class="slot-grid">
    <view
      v-for="item in slots"
      :key="item.slotId"
      class="slot-grid__cell appt-press"
      :class="{ 'slot-grid__cell--active': item.slotId === modelValue }"
      @click="emit('update:modelValue', item)"
    >
      {{ item.timePoint }}
    </view>
  </view>
</template>

<style lang="scss" scoped>
.slot-grid {
  display: flex;
  flex-wrap: wrap;

  &__cell {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: calc((100% - 32rpx) / 3);
    height: 88rpx;
    margin-right: 16rpx;
    margin-bottom: 16rpx;
    border: 1rpx solid var(--appt-primary);
    border-radius: 12rpx;
    background-color: var(--appt-surface);
    font-size: 28rpx;
    color: var(--appt-text);
    font-variant-numeric: tabular-nums;
    transition: background-color 120ms ease-out;

    &:nth-child(3n) {
      margin-right: 0;
    }

    &--active {
      border-color: var(--appt-primary);
      background-color: var(--appt-primary);
      color: #ffffff;
      font-weight: 600;
    }
  }
}
</style>
