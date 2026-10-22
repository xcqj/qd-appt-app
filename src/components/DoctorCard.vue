/**
 * 医生卡（DESIGN §9.4 两列卡）
 *
 * 字段只取 A3：staffId / name / avatarUrl / title / degree / campusName。
 * A3 不返回 clinicType / deptName / intro / 余量 → 本卡不渲染门诊类型 tag、不渲染擅长简介、
 * 不渲染「满诊 / 无号」（那是医生主页的语汇，红线 6）。
 */
<script setup lang="ts">
import { computed } from 'vue'

import type { StaffVo } from '@/api/appt/types'
import { titleLabel } from '@/utils/appt'

const props = defineProps<{ staff: StaffVo }>()
const emit = defineEmits<{ select: [] }>()

const avatar = computed(() => props.staff.avatarUrl || props.staff.avatar || '')
const meta = computed(() => [props.staff.degree, props.staff.campusName].filter(Boolean).join(' · '))
</script>

<template>
  <view class="doctor-card appt-card appt-press" @click="emit('select')">
    <view class="doctor-card__head">
      <image v-if="avatar" class="doctor-card__avatar" :src="avatar" mode="aspectFill" />
      <view v-else class="doctor-card__avatar doctor-card__avatar--empty" />
      <view class="doctor-card__id">
        <text class="doctor-card__name">{{ staff.name }}</text>
        <text class="doctor-card__title">{{ titleLabel(staff.title) }}</text>
      </view>
    </view>
    <text class="doctor-card__meta">{{ meta || '出诊信息以排班为准' }}</text>
  </view>
</template>

<style lang="scss" scoped>
.doctor-card {
  box-sizing: border-box;
  padding: 28rpx;
  border-radius: 24rpx;

  &__head {
    display: flex;
    align-items: center;
  }

  &__avatar {
    flex: none;
    width: 88rpx;
    height: 88rpx;
    margin-right: 16rpx;
    border-radius: 999rpx;
    background-color: var(--appt-surface-weak);

    &--empty {
      background-color: var(--appt-surface-weak);
    }
  }

  &__id {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__name {
    font-size: 32rpx;
    font-weight: 600;
    line-height: 1.4;
    color: var(--appt-text);
  }

  &__title {
    margin-top: 4rpx;
    font-size: 24rpx;
    line-height: 1.4;
    color: var(--appt-text-sub);
  }

  &__meta {
    display: block;
    margin-top: 16rpx;
    font-size: 24rpx;
    line-height: 1.4;
    color: var(--appt-text-weak);
  }
}
</style>
