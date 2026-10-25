<template>
  <!--
    统一页脚声明（DESIGN §8.3）
    只用于信息展示型页面：首页 / 我的 / 就诊指南 / 院区详情 / 须知与规则。
    选时间、确认预约、支付三页有底部固定操作条，不引入本组件。
  -->
  <text class="app-footer">演示系统 · 数据虚构 · 不提供医疗服务</text>
</template>

<style lang="scss" scoped>
.app-footer {
  display: block;
  margin-top: 40rpx;
  font-size: 20rpx;
  line-height: 1.6;
  color: var(--appt-text-weak);
}
</style>
