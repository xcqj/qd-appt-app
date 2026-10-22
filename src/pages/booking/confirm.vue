<script setup lang="ts">
/**
 * 9.7 确认预约（DESIGN §9.7）
 *
 * 字段：就诊人 B6 `id / name / idNoMasked / isDefault`；提交 B1 `{slotId, patientId}`（带 Idempotency-Key）；
 *       回参 `paymentNo / amount / expireTime` 直接带给支付页（没有独立的「创建支付」端点）。
 * 交互：提交成功后 `redirectTo` 支付页，本页不留在栈里；失败保留已填内容并给中文文案（DESIGN §8.2）。
 */
import { onLoad } from '@dcloudio/uni-app'
import { computed, reactive, ref } from 'vue'

import type { PatientVo } from '@/api/appt/types'
import { addPatient, bookRegistration, listPatients } from '@/api/appt/patient'
import MoneyText from '@/components/MoneyText.vue'
import PageState from '@/components/PageState.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { navigateBack, redirectTo, ROUTES } from '@/router/routes'
import { useBookingStore } from '@/store/booking'
import { bizMessage, idTypeLabel, visitTimeText } from '@/utils/appt'

const booking = useBookingStore()

const selectedPatientId = ref('')
const submitting = ref(false)
const patientPopup = ref(false)
const patientSaving = ref(false)
/** 弹层内的行内错误（toast 一闪而过，证件号这类硬校验要能停住看） */
const patientError = ref('')

const patientForm = reactive({
  name: '',
  idType: 'IDCARD',
  idNo: '',
})

const { data: patients, loading, error, run: loadPatients } = useAsyncData<PatientVo[]>(listPatients)

const selectedPatient = computed<PatientVo | null>(
  () => (patients.value ?? []).find((item) => item.id === selectedPatientId.value) ?? null,
)

const slot = computed(() => booking.slot)
const missingContext = computed(() => !booking.slot)

const visitText = computed(() =>
  slot.value ? visitTimeText(booking.visitDate, booking.period, slot.value.timePoint) : '',
)

const infoRows = computed(() => [
  { label: '就诊医生', value: booking.staff?.name ?? '' },
  { label: '就诊科室', value: booking.dept?.name ?? '' },
  { label: '就诊院区', value: booking.campus?.name ?? '' },
  { label: '就诊时间', value: visitText.value },
])

function pickPatient(id: string): void {
  selectedPatientId.value = id
}

function openPatientPopup(): void {
  patientForm.name = ''
  patientForm.idType = 'IDCARD'
  patientForm.idNo = ''
  patientError.value = ''
  patientPopup.value = true
}

async function savePatient(): Promise<void> {
  if (patientSaving.value) {
    return
  }
  patientError.value = ''
  if (!patientForm.name.trim()) {
    patientError.value = '请填写就诊人姓名'
    return
  }
  if (!patientForm.idNo.trim()) {
    patientError.value = '请填写证件号（身份证或就诊卡号）'
    return
  }
  patientSaving.value = true
  try {
    const created = await addPatient({
      name: patientForm.name.trim(),
      idType: patientForm.idType,
      idNo: patientForm.idNo.trim(),
      isDefault: false,
    })
    // 直接把后端返回的就诊人插进本地列表：不依赖二次拉取，
    // 否则「保存成功但列表没变」会被当成没做成（排序与 B6 一致：默认项在前）
    const rest = (patients.value ?? []).filter((item) => item.id !== created.id)
    patients.value = [
      ...rest.filter((item) => item.isDefault),
      created,
      ...rest.filter((item) => !item.isDefault),
    ]
    selectedPatientId.value = created.id
    patientPopup.value = false
    uni.showToast({ title: '就诊人添加成功', icon: 'none' })
  } catch (e) {
    patientError.value = bizMessage(e)
  } finally {
    patientSaving.value = false
  }
}

async function submit(): Promise<void> {
  if (!slot.value || submitting.value) {
    return
  }
  if (!selectedPatientId.value) {
    openPatientPopup()
    return
  }
  submitting.value = true
  try {
    const result = await bookRegistration({
      slotId: slot.value.slotId,
      patientId: selectedPatientId.value,
    })
    if (result.duplicate) {
      uni.showToast({ title: '该预约已提交，正在跳转支付', icon: 'none' })
    }
    redirectTo(ROUTES.bookingPayment, {
      paymentNo: result.paymentNo,
      amount: result.amount,
      expireTime: result.expireTime,
    })
  } catch (e) {
    uni.showToast({ title: bizMessage(e), icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function goBack(): void {
  navigateBack()
}

onLoad(async () => {
  if (missingContext.value) {
    return
  }
  const list = await loadPatients()
  const preferred = list?.find((item) => item.isDefault) ?? list?.[0]
  selectedPatientId.value = preferred?.id ?? ''
})
</script>

<template>
  <view class="appt-page confirm">
    <view class="appt-content confirm__body">
      <view v-if="missingContext" class="confirm__panel">
        <PageState :empty="true" empty-text="号源信息已失效" empty-desc="请重新选择就诊时间后再提交">
          <template #empty-action>
            <wd-button size="small" type="primary" @click="goBack">返回上一页</wd-button>
          </template>
        </PageState>
      </view>

      <template v-else>
        <PageState :loading="loading" :error="error" :rows="2" @retry="loadPatients">
          <view class="appt-card">
            <view class="confirm__card-head">
              <text class="appt-section-title">就诊人</text>
              <text class="appt-link" @click="openPatientPopup">+ 新增就诊人</text>
            </view>

            <view v-if="!patients || !patients.length" class="confirm__no-patient">
              <text class="appt-text">暂无就诊人</text>
              <text class="appt-weak confirm__no-patient-desc">挂号需绑定就诊人实名信息，先添加一位</text>
              <wd-button size="small" type="primary" @click="openPatientPopup">添加就诊人</wd-button>
            </view>

            <view
              v-for="patient in patients || []"
              :key="patient.id"
              class="confirm__patient appt-press"
              :class="{ 'confirm__patient--active': patient.id === selectedPatientId }"
              @click="pickPatient(patient.id)"
            >
              <view class="confirm__patient-info">
                <view class="confirm__patient-row">
                  <text class="confirm__patient-name">{{ patient.name }}</text>
                  <text v-if="patient.isDefault" class="confirm__badge">默认</text>
                </view>
                <text class="appt-weak">{{ idTypeLabel(patient.idType) }} {{ patient.idNoMasked }}</text>
              </view>
              <text class="confirm__check">{{ patient.id === selectedPatientId ? '已选' : '选择' }}</text>
            </view>
          </view>

          <view class="appt-card">
            <text class="appt-section-title">预约信息</text>
            <view class="confirm__info">
              <view v-for="row in infoRows" :key="row.label" class="appt-row">
                <text class="appt-sub">{{ row.label }}</text>
                <text class="appt-text confirm__info-value">{{ row.value }}</text>
              </view>
            </view>
          </view>

          <view class="appt-card">
            <text class="appt-section-title">就诊须知</text>
            <text class="confirm__notice">如需退号，请在就诊前一日 23:00 前在线办理，逾期将记入履约记录。</text>
            <text class="confirm__notice">请于就诊当天提前 15 分钟到院，在分诊台出示就诊码完成签到。</text>
          </view>
        </PageState>
      </template>
    </view>

    <view v-if="!missingContext" class="appt-bottom-bar confirm__bar">
      <view class="confirm__amount">
        <text class="appt-weak">合计</text>
        <MoneyText :amount="slot?.fee || '0.00'" />
      </view>
      <view class="confirm__submit">
        <wd-button type="primary" :loading="submitting" :disabled="submitting" @click="submit">
          {{ patients && patients.length ? '确认预约' : '请先添加就诊人' }}
        </wd-button>
      </view>
    </view>
    <view v-if="!missingContext" class="appt-bottom-placeholder" />

    <!-- z-index 必须高于底部固定条（.appt-bottom-bar 为 20），否则「保存」会被底栏盖住 -->
    <wd-popup v-model="patientPopup" position="bottom" round :z-index="1000">
      <view class="confirm__sheet">
        <text class="appt-section-title">新增就诊人</text>
        <text class="appt-weak confirm__sheet-hint">请填写与证件一致的就诊人信息；本系统为演示环境，不接入真实医疗系统</text>

        <view class="confirm__field">
          <text class="confirm__label">姓名<text class="confirm__required">*</text></text>
          <wd-input v-model="patientForm.name" placeholder="请输入就诊人姓名" />
        </view>

        <view class="confirm__field">
          <text class="confirm__label">证件类型</text>
          <view class="confirm__chips">
            <view
              v-for="type in ['IDCARD', 'CARD']"
              :key="type"
              class="confirm__chip"
              :class="{ 'confirm__chip--active': patientForm.idType === type }"
              @click="patientForm.idType = type"
            >
              {{ idTypeLabel(type) }}
            </view>
          </view>
        </view>

        <view class="confirm__field">
          <text class="confirm__label">证件号<text class="confirm__required">*</text></text>
          <wd-input v-model="patientForm.idNo" placeholder="请输入身份证号或就诊卡号" />
        </view>

        <text v-if="patientError" class="confirm__error">{{ patientError }}</text>

        <view class="confirm__sheet-actions">
          <wd-button variant="plain" @click="patientPopup = false">取消</wd-button>
          <wd-button type="primary" :loading="patientSaving" :disabled="patientSaving" @click="savePatient">保存</wd-button>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<style lang="scss" scoped>
.confirm {
  &__body {
    padding-top: 24rpx;
  }

  &__panel {
    padding-top: 40rpx;
  }

  &__card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__patient {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 20rpx;
    padding: 20rpx;
    border: 1rpx solid var(--appt-line);
    border-radius: 16rpx;

    &--active {
      border-color: var(--appt-primary);
      background-color: rgba(31, 122, 140, 0.06);
    }
  }

  &__patient-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__patient-row {
    display: flex;
    align-items: center;
    margin-bottom: 6rpx;
  }

  &__patient-name {
    font-size: 32rpx;
    font-weight: 600;
    color: var(--appt-text);
  }

  &__badge {
    margin-left: 12rpx;
    padding: 2rpx 12rpx;
    border-radius: 8rpx;
    background-color: rgba(31, 122, 140, 0.12);
    font-size: 22rpx;
    color: var(--appt-primary);
  }

  &__check {
    flex: none;
    margin-left: 16rpx;
    font-size: 24rpx;
    color: var(--appt-primary);
  }

  &__info {
    margin-top: 8rpx;
  }

  &__info-value {
    max-width: 420rpx;
    text-align: right;
  }

  &__notice {
    display: block;
    margin-top: 16rpx;
    font-size: 26rpx;
    line-height: 1.6;
    color: var(--appt-text-weak);
  }

  &__no-patient {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  &__no-patient-desc {
    margin: 12rpx 0 24rpx;
  }

  &__bar {
    justify-content: space-between;
  }

  &__amount {
    display: flex;
    align-items: baseline;
  }

  &__submit {
    flex: none;
    margin-left: 24rpx;
  }

  &__sheet {
    padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  }

  &__sheet-hint {
    display: block;
    margin-top: 8rpx;
  }

  &__field {
    margin-top: 24rpx;
  }

  &__label {
    display: block;
    margin-bottom: 12rpx;
    font-size: 26rpx;
    color: var(--appt-text-sub);
  }

  &__required {
    margin-left: 4rpx;
    color: var(--appt-danger);
  }

  &__error {
    display: block;
    margin-top: 20rpx;
    font-size: 24rpx;
    line-height: 1.5;
    color: var(--appt-danger);
  }

  &__chips {
    display: flex;
  }

  &__chip {
    margin-right: 16rpx;
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

  &__sheet-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 32rpx;
  }
}
</style>
