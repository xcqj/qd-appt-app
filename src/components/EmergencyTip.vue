<template>
  <!--
    急诊提示（DESIGN §8.3）
    首页 / 预约详情 / 就诊指南三处常驻；是说明文案，不是状态告警 —— 不用警示色、不加图标。
  -->
  <view class="emergency-tip">
    <text class="emergency-tip__title">急诊指引</text>
    <text class="emergency-tip__text">
      如出现突发胸痛、呼吸困难、意识障碍等情况，请立即拨打 120，或前往就近医院急诊科就诊；本系统不提供急诊与急救服务。
    </text>
  </view>
</template>

<style lang="scss" scoped>
.emergency-tip {
  box-sizing: border-box;
  margin-top: 20rpx;
  padding: 24rpx 28rpx;
  border-radius: 16rpx;
  background-color: var(--appt-surface-weak);

  &__title {
    display: block;
    font-size: 26rpx;
    font-weight: 600;
    line-height: 1.5;
    color: var(--appt-text);
  }

  &__text {
    display: block;
    margin-top: 8rpx;
    font-size: 26rpx;
    line-height: 1.6;
    color: var(--appt-text-sub);
  }
}
</style>
