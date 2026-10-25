<script setup lang="ts">
/**
 * 就诊流程引导条（DESIGN §8.3 固定文案 / §9.1 首页 / §9.10 预约详情）
 *
 * 两种模式：
 * - 传 `states`（5 项）→ 三态：已完成 / 当前 / 未开始；
 * - 不传 `states` → 静态说明（首页、就诊指南），只做序号 + 节点名，不带阶段语义。
 * 终态传 `terminatedText`：整体不点亮，只渲染这一句（已退号 / 已关闭 / 已爽约）。
 *
 * 纯展示：不发请求、无定时器、无循环动效；节点名唯一出处是 `REG_STEPS`。
 */
import type { StepState } from '@/utils/appt'
import { REG_STEPS } from '@/utils/appt'

const props = withDefaults(
  defineProps<{
    /** 五个节点状态；不传 = 静态说明模式 */
    states?: StepState[] | null
    /** 终态说明；非空时不渲染节点 */
    terminatedText?: string
    /** 标题行；不传则不渲染 */
    title?: string
  }>(),
  { states: null, terminatedText: '', title: '' },
)

function stateOf(index: number): StepState | '' {
  return props.states?.[index] ?? ''
}
</script>

<template>
  <view class="step-guide">
    <text v-if="title" class="step-guide__title">{{ title }}</text>

    <text v-if="terminatedText" class="step-guide__terminated">{{ terminatedText }}</text>

    <view v-else class="step-guide__bar">
      <view v-for="(step, index) in REG_STEPS" :key="step" class="step-guide__node">
        <view class="step-guide__track">
          <view class="step-guide__line" :class="{ 'step-guide__line--off': index === 0 }" />
          <view class="step-guide__dot" :class="stateOf(index) ? `step-guide__dot--${stateOf(index)}` : ''">
            {{ index + 1 }}
          </view>
          <view
            class="step-guide__line"
            :class="{ 'step-guide__line--off': index === REG_STEPS.length - 1 }"
          />
        </view>
        <text class="step-guide__label" :class="stateOf(index) ? `step-guide__label--${stateOf(index)}` : ''">
          {{ step }}
        </text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.step-guide {
  &__title {
    display: block;
    font-size: 36rpx;
    font-weight: 600;
    line-height: 1.4;
    color: var(--appt-text);
  }

  &__bar {
    display: flex;
    margin-top: 24rpx;
  }

  &__node {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    min-width: 0;
  }

  /* 轨道：左右两段线把圆点夹在节点中央，不依赖绝对定位 */
  &__track {
    display: flex;
    align-items: center;
    width: 100%;
  }

  &__line {
    flex: 1;
    height: 1rpx;
    background-color: var(--appt-line);

    /* 首尾节点外侧的线隐藏但保留占位，保证圆点居中 */
    &--off {
      visibility: hidden;
    }
  }

  &__dot {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background-color: var(--appt-surface-weak);
    color: var(--appt-text-sub);
    font-size: 22rpx;
    line-height: 1;

    &--done {
      background-color: var(--appt-primary);
      color: #ffffff;
    }

    &--current {
      box-sizing: border-box;
      border: 2rpx solid var(--appt-primary);
      background-color: var(--appt-surface);
      color: var(--appt-primary);
      font-weight: 600;
    }

    &--pending {
      background-color: var(--appt-surface-weak);
      color: var(--appt-text-weak);
    }
  }

  &__label {
    margin-top: 12rpx;
    font-size: 22rpx;
    line-height: 1.4;
    color: var(--appt-text-sub);
    white-space: nowrap;

    &--done {
      color: var(--appt-primary);
    }

    &--current {
      color: var(--appt-primary);
      font-weight: 600;
    }

    &--pending {
      color: var(--appt-text-weak);
    }
  }

  &__terminated {
    display: block;
    margin-top: 16rpx;
    font-size: 26rpx;
    line-height: 1.5;
    color: var(--appt-text-sub);
  }
}
</style>
