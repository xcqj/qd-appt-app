<script setup lang="ts">
/**
 * 9.17 须知与规则（DESIGN §9.17）
 *
 * 静态内容、无接口请求 → 不设骨架（沿用 §9.11「本页无接口请求，不需要骨架」的先例）。
 * 数字口径唯一权威是 PRD §6 / §14.1：改任一条数字，必须同步 PRD 与 DESIGN §9.17。
 */
import AppFooter from '@/components/AppFooter.vue'

interface RuleItem {
  /** 需要强调的时限片段（600 字重）；不传则整条同权重 */
  label?: string
  text: string
}

interface RuleSection {
  title: string
  items: RuleItem[]
}

const sections: RuleSection[] = [
  {
    title: '挂号须知',
    items: [
      { label: '可预约就诊日前 1 至 7 天', text: '的号源，每日 08:00 放出第 7 天号源。' },
      {
        label: '15 分钟',
        text: '内完成支付；超时未支付的预约自动关闭，号源回到可预约状态。',
      },
      { text: '预约时须选择就诊人，就诊人信息应与本人证件一致。' },
      { text: '挂号费按职称与门诊类型标准收取，支付成功后可在「我的预约」查看。' },
    ],
  },
  {
    title: '退号规则',
    items: [
      {
        label: '就诊前一日 23:00',
        text: '前，可在「我的预约」进入预约详情在线退号。',
      },
      { text: '就诊当日及以后不再支持在线退号，请到就诊院区窗口办理。' },
      { text: '退号成功后号源立即释放，可重新预约其他号源。' },
      { text: '医生停诊时由医院批量办理退号并原路退款，不计入违约次数。' },
    ],
  },
  {
    title: '退款到账时效',
    items: [
      { label: '1–3 个工作日', text: '内原路退回，到账时间受支付渠道影响。' },
      { text: '超过 3 个工作日仍未到账，请联系门诊服务台核对退款单。' },
      { text: '停诊退号与主动退号的退款规则一致。' },
      { text: '爽约不退还已支付的挂号费。' },
    ],
  },
  {
    title: '签到与爽约',
    items: [
      { label: '就诊当日 00:00', text: '起可签到，到院后向分诊台出示就诊码。' },
      { label: '就诊时刻后 30 分钟', text: '仍未签到的预约，记为爽约，号源不再保留。' },
      { text: '已签到的预约请在候诊区等候叫号，迟到过号由分诊台另行安排。' },
      { text: '爽约记录计入违约次数，不予退款。' },
    ],
  },
  {
    title: '限购与违约',
    items: [
      { text: '同一就诊人同一就诊日仅可持有 1 个预约。' },
      { text: '同一账号同时持有的有效预约不超过 3 个。' },
      { label: '半年内退号与爽约合计 6 次', text: '，账号将被限制预约权限 6 个月。' },
      { text: '超时未支付导致的预约关闭，不计入违约次数。' },
      { text: '对限制结果有异议，请联系门诊服务台。' },
    ],
  },
]
</script>

<template>
  <view class="appt-page rules">
    <view class="appt-content rules__body">
      <text class="rules__intro">以下条款适用于各院区门诊预约，具体以院区现场公示为准。</text>

      <view v-for="section in sections" :key="section.title" class="appt-card rules__section">
        <text class="appt-section-title rules__title">{{ section.title }}</text>
        <view v-for="(item, index) in section.items" :key="index" class="rules__item">
          <text v-if="item.label" class="rules__label">{{ item.label }}</text>
          <text>{{ item.text }}</text>
        </view>
      </view>

      <AppFooter />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.rules {
  &__body {
    padding-top: 24rpx;
  }

  &__intro {
    display: block;
    font-size: 26rpx;
    line-height: 1.6;
    color: var(--appt-text-sub);
  }

  &__section {
    margin-top: 20rpx;
  }

  &__title {
    display: block;
  }

  &__item {
    margin-top: 16rpx;
    font-size: 28rpx;
    line-height: 1.7;
    color: var(--appt-text);
  }

  &__label {
    font-weight: 600;
  }
}
</style>
