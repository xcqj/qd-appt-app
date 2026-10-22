/**
 * 挂号状态标签（DESIGN §2.3 唯一出处）
 *
 * 只认 Registration 线值；颜色全部来自状态映射表，页面不得自定义状态色。
 * 标签底色 = 状态色 12% 透明度，文字 = 状态色本身，圆角 8rpx / 字号 22rpx。
 */
<script setup lang="ts">
import { computed } from 'vue'

import { regStatusLabel, regStatusTone } from '@/utils/appt'

const props = defineProps<{ status: string }>()

const label = computed(() => regStatusLabel(props.status))
const tone = computed(() => regStatusTone(props.status))
</script>

<template>
  <text class="status-tag" :class="`status-tag--${tone}`">{{ label }}</text>
</template>

<style lang="scss" scoped>
.status-tag {
  display: inline-block;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;

  &--warn {
    color: #d98e04;
    background-color: rgba(217, 142, 4, 0.12);
  }

  &--info {
    color: #3b82c4;
    background-color: rgba(59, 130, 196, 0.12);
  }

  &--success {
    color: #2e9e6b;
    background-color: rgba(46, 158, 107, 0.12);
  }

  &--neutral {
    color: #5a667e;
    background-color: rgba(90, 102, 126, 0.1);
  }

  &--muted {
    color: #8a94a6;
    background-color: rgba(138, 148, 166, 0.12);
  }

  &--danger {
    color: #d14343;
    background-color: rgba(209, 67, 67, 0.12);
  }
}
</style>
