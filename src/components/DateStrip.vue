/**
 * 横向日期栏（DESIGN §5 第 5 类 / §9.6A）
 *
 * 每格 120rpx：周几 24rpx + 日号 30rpx；选中主色底白字；`hasSchedule` 时格下方一个小圆点。
 * 不做「日 / 周」下拉日历（多一步操作）。
 */
<script setup lang="ts">
import type { DateVo } from '@/api/appt/types'
import { dayNumber, weekdayLabel } from '@/utils/appt'

defineProps<{ dates: DateVo[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
</script>

<template>
  <scroll-view class="date-strip" scroll-x :show-scrollbar="false">
    <view class="date-strip__inner">
      <view
        v-for="item in dates"
        :key="item.visitDate"
        class="date-strip__cell"
        :class="{
          'date-strip__cell--active': item.visitDate === modelValue,
          'date-strip__cell--off': !item.hasSchedule,
        }"
        @click="emit('update:modelValue', item.visitDate)"
      >
        <text class="date-strip__week">{{ weekdayLabel(item.visitDate) }}</text>
        <text class="date-strip__day">{{ dayNumber(item.visitDate) }}</text>
        <view v-if="item.hasSchedule" class="date-strip__dot" />
      </view>
    </view>
  </scroll-view>
</template>

<style lang="scss" scoped>
.date-strip {
  width: 100%;
  white-space: nowrap;

  &__inner {
    display: inline-flex;
    padding: 4rpx 0 8rpx;
  }

  &__cell {
    display: inline-flex;
    flex-direction: column;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 120rpx;
    height: 132rpx;
    margin-right: 12rpx;
    border-radius: 16rpx;
    background-color: var(--appt-surface);
    box-shadow: var(--appt-shadow-card);
    transition: background-color 120ms ease-out;

    &--active {
      background-color: var(--appt-primary);

      .date-strip__week,
      .date-strip__day {
        color: #ffffff;
      }

      .date-strip__dot {
        background-color: #ffffff;
      }
    }

    &--off {
      .date-strip__week,
      .date-strip__day {
        color: var(--appt-text-weak);
      }
    }
  }

  &__week {
    font-size: 24rpx;
    line-height: 1.4;
    color: var(--appt-text-sub);
  }

  &__day {
    margin-top: 4rpx;
    font-size: 30rpx;
    font-weight: 600;
    line-height: 1.4;
    color: var(--appt-text);
    font-variant-numeric: tabular-nums;
  }

  &__dot {
    width: 6rpx;
    height: 6rpx;
    margin-top: 8rpx;
    border-radius: 999rpx;
    background-color: var(--appt-primary);
  }
}
</style>
