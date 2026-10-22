/**
 * 金额展示（DESIGN §5 第 8 类）
 *
 * `¥` 22rpx + 数字 600 权重 + 等宽数字；**两位小数不省略**、禁止千分位重排。
 * amount 必须是服务端字符串（BigDecimal 序列化），本组件不做任何数值转换。
 */
<script setup lang="ts">
withDefaults(defineProps<{ amount: string; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })
</script>

<template>
  <text class="appt-money" :class="`appt-money--${size}`">
    <text class="appt-money__symbol">¥</text>
    <text class="appt-money__value">{{ amount }}</text>
  </text>
</template>

<style lang="scss" scoped>
.appt-money--sm .appt-money__value {
  font-size: 28rpx;
}

.appt-money--md .appt-money__value {
  font-size: 30rpx;
}

.appt-money--lg {
  align-items: center;

  .appt-money__symbol {
    font-size: 44rpx;
    font-weight: 600;
  }

  .appt-money__value {
    font-size: 72rpx;
    font-weight: 700;
    line-height: 1.2;
  }
}
</style>
