<script setup lang="ts">
/**
 * 停诊上报（S11.1 · 契约 §7.5 E5）
 *
 * 只做「上报」：登记谁 / 哪天 / 什么范围 / 为什么停诊，生成 S 批号。
 * 真正的批量退号 + 退款 + 站内信由后台「停诊处理」执行（两段式，PRD §6.10）。
 *
 * 范围与 `scopeValue`（后端 `SuspendScopeParser` 的解析口径）：
 * - `SCHEDULE`（单个午别）：`scopeValue = scheduleId`，不收 `endDate`
 * - `STAFF_DATE`（某医生某日/区间）：`scopeValue = yyyy-MM-dd`，`staffId` 必填，可带 `endDate`
 * - `CAMPUS_DATE`（院区某日/区间）：`scopeValue = campusId:yyyy-MM-dd`，可带 `endDate`
 * 约束：开始日不得早于今天；单次跨度 ≤ 31 天（后端校验，前端同样挡一次）。
 */
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'

import type { CampusVo, DeptTreeVo, ScheduleStaffVo, SuspendReportVo } from '@/api/appt/types'
import { getDeptTree, getScheduleStaffs, listCampus } from '@/api/appt/public'
import { reportSuspend } from '@/api/appt/triage'
import TriageTabbar from '@/components/TriageTabbar.vue'
import { ROUTES } from '@/router/routes'
import { useUserStore } from '@/store/user'
import { bizMessage, periodLabel } from '@/utils/appt'

const userStore = useUserStore()

const SCOPE_OPTIONS = [
  { key: 'CAMPUS_DATE', label: '院区某日', hint: '整个院区停诊（如台风、设备故障）' },
  { key: 'STAFF_DATE', label: '某医生某日', hint: '按医生停诊，可跨多日' },
  { key: 'SCHEDULE', label: '单个午别', hint: '只停某医生某天的一个午别' },
] as const

const scopeType = ref<'CAMPUS_DATE' | 'STAFF_DATE' | 'SCHEDULE'>('CAMPUS_DATE')
const campusOptions = ref<CampusVo[]>([])
const campusId = ref('')
const deptOptions = ref<DeptTreeVo[]>([])
const deptId = ref('')
const startDate = ref(today())
const endDate = ref(today())
const staffOptions = ref<ScheduleStaffVo[]>([])
const staffId = ref('')
const period = ref('')
const reason = ref('')
const submitting = ref(false)
const formError = ref('')
const result = ref<SuspendReportVo | null>(null)

const scopeHint = computed(() => SCOPE_OPTIONS.find((item) => item.key === scopeType.value)?.hint ?? '')
const needDept = computed(() => scopeType.value !== 'CAMPUS_DATE')
const needStaff = computed(() => scopeType.value !== 'CAMPUS_DATE')
const needPeriod = computed(() => scopeType.value === 'SCHEDULE')
const needEndDate = computed(() => scopeType.value !== 'SCHEDULE')

const selectedStaff = computed(() => staffOptions.value.find((item) => item.staffId === staffId.value) ?? null)
const periodOptions = computed(() => selectedStaff.value?.periods ?? [])
const selectedPeriod = computed(() => periodOptions.value.find((item) => item.period === period.value) ?? null)

/** 当前选择的可读摘要：结果卡里回显，避免「批号对应的是谁」说不清 */
const selectionSummary = computed(() => {
  const campusName = campusOptions.value.find((item) => item.campusId === campusId.value)?.name ?? ''
  const deptName = deptOptions.value.find((item) => item.deptId === deptId.value)?.name ?? ''
  const staffName = selectedStaff.value?.name ?? ''
  const dateText = endDate.value !== startDate.value ? `${startDate.value} ~ ${endDate.value}` : startDate.value
  if (scopeType.value === 'CAMPUS_DATE') {
    return `${campusName} · ${dateText}`
  }
  if (scopeType.value === 'STAFF_DATE') {
    return `${campusName} · ${deptName} · ${staffName} · ${dateText}`
  }
  const periodText = selectedPeriod.value ? periodLabel(selectedPeriod.value.period) : ''
  return `${campusName} · ${deptName} · ${staffName} · ${dateText} ${periodText}`
})

function today(offset = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const minDate = computed(() => today())
const maxDate = computed(() => today(30))

/** A2 树摊平成可选科室：只保留叶子（有子级说明还能往下钻，不是可停诊的最小单位） */
function flattenLeaves(nodes: DeptTreeVo[]): DeptTreeVo[] {
  const leaves: DeptTreeVo[] = []
  nodes.forEach((node) => {
    const children = node.children ?? []
    if (children.length) {
      leaves.push(...flattenLeaves(children))
    } else {
      leaves.push(node)
    }
  })
  return leaves
}

async function loadCampus(): Promise<void> {
  try {
    const list = await listCampus()
    campusOptions.value = list
    if (!campusId.value && list.length) {
      campusId.value = list[0].campusId
    }
  } catch (e) {
    formError.value = bizMessage(e)
  }
}

async function loadDept(): Promise<void> {
  deptOptions.value = []
  deptId.value = ''
  if (!campusId.value) {
    return
  }
  try {
    const tree = await getDeptTree(campusId.value)
    deptOptions.value = flattenLeaves(tree)
  } catch (e) {
    formError.value = bizMessage(e)
  }
}

async function loadStaff(): Promise<void> {
  staffOptions.value = []
  staffId.value = ''
  period.value = ''
  if (!needDept.value || !deptId.value) {
    return
  }
  try {
    staffOptions.value = await getScheduleStaffs({ deptId: deptId.value, date: startDate.value })
  } catch (e) {
    formError.value = bizMessage(e)
  }
}

function pickScope(key: 'CAMPUS_DATE' | 'STAFF_DATE' | 'SCHEDULE'): void {
  scopeType.value = key
  formError.value = ''
  result.value = null
  endDate.value = startDate.value
  period.value = ''
}

function pickDept(id: string): void {
  deptId.value = id
  formError.value = ''
  // 换了科室/医生/午别就是新的上报对象，旧批号结果必须清掉，避免误读成「当前选择已上报」
  result.value = null
}

function pickStaff(id: string): void {
  staffId.value = id
  period.value = ''
  formError.value = ''
  result.value = null
}

function pickPeriod(value: string): void {
  period.value = value
  result.value = null
}

function onStartChange(event: { detail: { value: string } }): void {
  startDate.value = event.detail.value
  if (endDate.value < startDate.value) {
    endDate.value = startDate.value
  }
  result.value = null
}

function onEndChange(event: { detail: { value: string } }): void {
  endDate.value = event.detail.value
  result.value = null
}

function validate(): string {
  if (!campusId.value) {
    return '请选择就诊院区'
  }
  if (needDept.value && !deptId.value) {
    return '请选择科室'
  }
  if (needStaff.value && !staffId.value) {
    return '请选择停诊医生'
  }
  if (needPeriod.value && !selectedPeriod.value?.scheduleId) {
    return '请选择停诊午别'
  }
  if (!reason.value.trim()) {
    return '请填写停诊原因（会展示在患者站内信中）'
  }
  if (needEndDate.value && endDate.value < startDate.value) {
    return '结束日期不能早于开始日期'
  }
  return ''
}

function buildBody() {
  const common = { staffId: staffId.value || undefined, reason: reason.value.trim() }
  if (scopeType.value === 'CAMPUS_DATE') {
    return {
      ...common,
      staffId: undefined,
      scopeType: 'CAMPUS_DATE' as const,
      scopeValue: `${campusId.value}:${startDate.value}`,
      endDate: endDate.value !== startDate.value ? endDate.value : undefined,
    }
  }
  if (scopeType.value === 'STAFF_DATE') {
    return {
      ...common,
      scopeType: 'STAFF_DATE' as const,
      scopeValue: startDate.value,
      endDate: endDate.value !== startDate.value ? endDate.value : undefined,
    }
  }
  return {
    ...common,
    scopeType: 'SCHEDULE' as const,
    scopeValue: selectedPeriod.value?.scheduleId ?? '',
  }
}

async function submit(): Promise<void> {
  if (submitting.value) {
    return
  }
  formError.value = validate()
  if (formError.value) {
    return
  }
  submitting.value = true
  try {
    const data = await reportSuspend(buildBody())
    result.value = data
    uni.showToast({ title: data.duplicate ? '该范围已上报' : '上报成功', icon: 'none' })
  } catch (e) {
    formError.value = bizMessage(e)
  } finally {
    submitting.value = false
  }
}

function backToPatient(): void {
  uni.switchTab({ url: ROUTES.home })
}

watch(campusId, () => {
  void loadDept()
})

watch([deptId, startDate, scopeType], () => {
  void loadStaff()
})

onLoad(() => {
  void loadCampus()
})

onShow(() => {
  if (!campusOptions.value.length) {
    void loadCampus()
  }
})
</script>

<template>
  <view class="appt-page suspend">
    <view class="appt-content suspend__body">
      <view class="appt-card">
        <text class="appt-section-title">停诊上报</text>
        <text class="appt-weak">
          上报仅登记停诊范围，退号与退款由后台「停诊处理」执行；已签到的预约不参与批量退号。
        </text>
        <text class="appt-weak suspend__account">当前账号：{{ userStore.displayName }}</text>

        <view class="suspend__field">
          <text class="suspend__label">停诊范围</text>
          <view class="suspend__chips">
            <view
              v-for="item in SCOPE_OPTIONS"
              :key="item.key"
              class="suspend__chip"
              :class="{ 'suspend__chip--active': scopeType === item.key }"
              @click="pickScope(item.key)"
            >
              {{ item.label }}
            </view>
          </view>
          <text class="appt-weak suspend__hint">{{ scopeHint }}</text>
        </view>

        <view class="suspend__field">
          <text class="suspend__label">就诊院区<text class="suspend__required">*</text></text>
          <view class="suspend__chips">
            <view
              v-for="item in campusOptions"
              :key="item.campusId"
              class="suspend__chip"
              :class="{ 'suspend__chip--active': campusId === item.campusId }"
              @click="campusId = item.campusId"
            >
              {{ item.name }}
            </view>
          </view>
        </view>

        <view v-if="needDept" class="suspend__field">
          <text class="suspend__label">科室<text class="suspend__required">*</text></text>
          <view class="suspend__chips suspend__chips--scroll">
            <view
              v-for="item in deptOptions"
              :key="item.deptId"
              class="suspend__chip"
              :class="{ 'suspend__chip--active': deptId === item.deptId }"
              @click="pickDept(item.deptId)"
            >
              {{ item.name }}
            </view>
          </view>
        </view>

        <picker mode="date" :value="startDate" :start="minDate" :end="maxDate" @change="onStartChange">
          <view class="appt-row suspend__row">
            <text class="appt-sub">开始日期</text>
            <text class="appt-text">{{ startDate }} ›</text>
          </view>
        </picker>

        <picker
          v-if="needEndDate"
          mode="date"
          :value="endDate"
          :start="startDate"
          :end="maxDate"
          @change="onEndChange"
        >
          <view class="appt-row suspend__row">
            <text class="appt-sub">结束日期</text>
            <text class="appt-text">{{ endDate === startDate ? '与开始日期相同' : endDate }} ›</text>
          </view>
        </picker>

        <template v-if="needStaff">
          <view class="suspend__field">
            <text class="suspend__label">停诊医生<text class="suspend__required">*</text></text>
            <view v-if="staffOptions.length" class="suspend__chips suspend__chips--scroll">
              <view
                v-for="item in staffOptions"
                :key="item.staffId"
                class="suspend__chip"
                :class="{ 'suspend__chip--active': staffId === item.staffId }"
                @click="pickStaff(item.staffId)"
              >
                {{ item.name }}
              </view>
            </view>
            <text v-else class="appt-weak">该科室所选日期暂无出诊医生，请调整科室或日期</text>
          </view>

          <view v-if="needPeriod && staffId" class="suspend__field">
            <text class="suspend__label">停诊午别<text class="suspend__required">*</text></text>
            <view class="suspend__chips">
              <view
                v-for="item in periodOptions"
                :key="item.period"
                class="suspend__chip"
                :class="{ 'suspend__chip--active': period === item.period }"
                @click="pickPeriod(item.period)"
              >
                {{ periodLabel(item.period) }}
              </view>
            </view>
          </view>
        </template>

        <view class="suspend__field">
          <text class="suspend__label">停诊原因<text class="suspend__required">*</text></text>
          <wd-textarea v-model="reason" :maxlength="100" placeholder="将展示在患者站内信中，例如：医生急诊手术" />
        </view>

        <text v-if="formError" class="suspend__error">{{ formError }}</text>

        <view class="suspend__submit">
          <wd-button type="primary" block :loading="submitting" :disabled="submitting" @click="submit()">
            提交上报
          </wd-button>
        </view>
      </view>

      <view v-if="result" class="appt-card suspend__result">
        <text class="appt-section-title">{{ result.duplicate ? '该范围已上报，批号复用' : '上报成功' }}</text>
        <view class="appt-row">
          <text class="appt-sub">停诊批号</text>
          <text class="appt-text suspend__mono">{{ result.batchNo }}</text>
        </view>
        <view class="appt-row">
          <text class="appt-sub">处理状态</text>
          <text class="appt-text">待处理</text>
        </view>
        <view class="appt-row">
          <text class="appt-sub">停诊对象</text>
          <text class="appt-text">{{ selectionSummary }}</text>
        </view>
        <view class="appt-row">
          <text class="appt-sub">范围编码</text>
          <text class="appt-text suspend__mono">{{ result.scopeValue }}</text>
        </view>
        <text class="appt-weak">
          请到后台「排班管理 → 停诊处理」执行退号与退款；处理完成后患者会收到站内信。
        </text>
      </view>

      <view class="suspend__footer">
        <text class="appt-link" @click="backToPatient">返回患者端 ›</text>
      </view>
    </view>

    <view class="suspend__tabbar-gap" />
    <TriageTabbar active="suspend" />
  </view>
</template>

<style lang="scss" scoped>
.suspend {
  &__body {
    padding-top: 24rpx;
  }

  &__account {
    margin-top: 8rpx;
  }

  &__field {
    margin-top: 28rpx;
  }

  &__label {
    font-size: 26rpx;
    color: var(--appt-text-sub);
  }

  &__required {
    margin-left: 4rpx;
    color: var(--appt-danger);
  }

  &__hint {
    display: block;
    margin-top: 10rpx;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    margin-top: 12rpx;

    &--scroll {
      flex-wrap: nowrap;
      overflow-x: auto;
    }
  }

  &__chip {
    flex: none;
    margin: 0 16rpx 12rpx 0;
    padding: 12rpx 28rpx;
    border: 1rpx solid var(--appt-line);
    border-radius: 12rpx;
    font-size: 26rpx;
    color: var(--appt-text-sub);

    &--active {
      border-color: var(--appt-primary);
      background-color: rgba(31, 122, 140, 0.08);
      color: var(--appt-primary);
    }
  }

  &__row {
    margin-top: 20rpx;
  }

  &__error {
    display: block;
    margin-top: 20rpx;
    font-size: 24rpx;
    color: var(--appt-danger);
  }

  &__submit {
    margin-top: 32rpx;
  }

  &__result {
    margin-top: 20rpx;
  }

  &__mono {
    font-variant-numeric: tabular-nums;
  }

  &__footer {
    padding: 32rpx 0 8rpx;
    text-align: center;
  }

  &__tabbar-gap {
    height: calc(120rpx + env(safe-area-inset-bottom));
  }
}
</style>
